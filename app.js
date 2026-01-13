import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCUVjaNWqQcax68Vvk8VoBJGfoiL98-L88",
    authDomain: "zoiao-restaurante.firebaseapp.com",
    databaseURL: "https://zoiao-restaurante-default-rtdb.firebaseio.com",
    projectId: "zoiao-restaurante",
    storageBucket: "zoiao-restaurante-default-rtdb.firebaseio.com",
    messagingSenderId: "975025400792",
    appId: "1:975025400792:web:7c937c8d6cef32044420ad"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let carrinho = [];
let dadosCardapio = null;
let dadosMesas = null;

// --- LOGIN COM LIMPEZA DE ESPAÇOS ---
window.onload = () => {
    const salvo = localStorage.getItem('atendente');
    if (salvo) {
        document.getElementById('nome-atendente').value = salvo;
        fazerLogin();
    }
};

window.fazerLogin = async function() {
    const campoNome = document.getElementById('nome-atendente');
    let nomeBruto = campoNome.value;
    if (!nomeBruto || nomeBruto.trim() === "") return alert("Digite seu nome.");

    const nomeLimpo = nomeBruto.trim().replace(/\s+/g, ' ');
    const slug = nomeLimpo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

    try {
        await update(ref(db, 'atendentes/' + slug), {
            nome_exibicao: nomeLimpo,
            ultimo_acesso: new Date().toLocaleString(),
            status: "online"
        });
        localStorage.setItem('atendente', nomeLimpo);
        document.getElementById('user-display').innerText = nomeLimpo;
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('tela-dashboard').style.display = 'block';
        carregarDadosBase();
        ouvirPedidos();
    } catch (e) { alert("Erro de conexão."); }
};

window.logout = () => { localStorage.removeItem('atendente'); location.reload(); };

// --- NAVEGAÇÃO ---
window.mudarAbaPrincipal = (aba, btn) => {
    document.querySelectorAll('#tabs-principais .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('sub-mesas').style.display = aba === 'mesas' ? 'block' : 'none';
    document.getElementById('sub-pedidos').style.display = aba === 'pedidos' ? 'block' : 'none';
};

window.voltarParaDashboard = () => {
    document.getElementById('tela-pedido').style.display = 'none';
    document.getElementById('tela-dashboard').style.display = 'block';
};

// --- CARREGAMENTO DE DADOS ---
async function carregarDadosBase() {
    const [snM, snP] = await Promise.all([get(ref(db, 'setores_mesas')), get(ref(db, 'produtos'))]);
    if (snM.exists()) { dadosMesas = snM.val(); montarSetores(); }
    if (snP.exists()) { dadosCardapio = snP.val(); montarCategorias(); }
}

function montarSetores() {
    const cont = document.getElementById('tabs-setores');
    cont.innerHTML = "";
    Object.keys(dadosMesas).forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = "tab-btn" + (i === 0 ? " active" : "");
        btn.innerText = s;
        btn.onclick = () => {
            document.querySelectorAll('#tabs-setores .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarGrid(s);
        };
        cont.appendChild(btn);
    });
    renderizarGrid(Object.keys(dadosMesas)[0]);
}

function renderizarGrid(s) {
    const grid = document.getElementById('grid-mesas');
    grid.innerHTML = "";
    for (let id in dadosMesas[s]) {
        const m = dadosMesas[s][id];
        const btn = document.createElement('button');
        btn.className = "mesa-btn";
        btn.innerText = "Mesa " + m.numero;
        btn.onclick = () => {
            document.getElementById('mesa-titulo').innerText = `${s} - Mesa ${m.numero}`;
            document.getElementById('tela-dashboard').style.display = 'none';
            document.getElementById('tela-pedido').style.display = 'block';
            carrinho = [];
            atualizarCarrinho();
        };
        grid.appendChild(btn);
    }
}

function montarCategorias() {
    const cont = document.getElementById('tabs-categorias');
    cont.innerHTML = "";
    Object.keys(dadosCardapio).forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = "tab-btn" + (i === 0 ? " active" : "");
        btn.innerText = c;
        btn.onclick = () => {
            document.querySelectorAll('#tabs-categorias .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarProdutos(c);
        };
        cont.appendChild(btn);
    });
    renderizarProdutos(Object.keys(dadosCardapio)[0]);
}

function renderizarProdutos(cat) {
    const cont = document.getElementById('produtos-container');
    cont.innerHTML = "";
    for (let id in dadosCardapio[cat]) {
        const p = dadosCardapio[cat][id];
        const btn = document.createElement('button');
        btn.className = "produto-btn";
        btn.innerHTML = `<span>${p.nome}</span> <strong>R$ ${p.preco.toFixed(2)}</strong>`;
        btn.onclick = () => { carrinho.push(p); atualizarCarrinho(); };
        cont.appendChild(btn);
    }
}

function atualizarCarrinho() {
    const ul = document.getElementById('lista-carrinho-ul');
    ul.innerHTML = "";
    let total = 0;
    carrinho.forEach((item, i) => {
        total += item.preco;
        ul.innerHTML += `<li style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee;">
            ${item.nome} <b onclick="removerItem(${i})" style="color:red; cursor:pointer">X</b>
        </li>`;
    });
    document.getElementById('total-pedido').innerText = `R$ ${total.toFixed(2)}`;
}

window.removerItem = (i) => { carrinho.splice(i, 1); atualizarCarrinho(); };

// --- ENVIO COMPARTILHADO (RODRIGO + YASMIN NA MESMA MESA) ---
window.enviarPedidoFinal = async () => {
    if (!carrinho.length) return alert("Carrinho vazio!");
    
    const atendenteAtual = localStorage.getItem('atendente');
    const mesaNome = document.getElementById('mesa-titulo').innerText;
    const dbRef = ref(db, 'pedidos');

    try {
        const snapshot = await get(dbRef);
        let pedidoIdExistente = null;
        let itensAnteriores = [];

        if (snapshot.exists()) {
            const todosPedidos = snapshot.val();
            // Busca se existe QUALQUER pedido aberto para esta mesa (independente do atendente)
            for (let id in todosPedidos) {
                if (todosPedidos[id].mesa === mesaNome && todosPedidos[id].status !== 'finalizado') {
                    pedidoIdExistente = id;
                    itensAnteriores = todosPedidos[id].itens || [];
                    break;
                }
            }
        }

        if (pedidoIdExistente) {
            // ATUALIZA CONTA EXISTENTE
            const novosItens = [...itensAnteriores, ...carrinho];
            await update(ref(db, `pedidos/${pedidoIdExistente}`), {
                itens: novosItens,
                total: novosItens.reduce((acc, i) => acc + i.preco, 0),
                status: 'pendente', // Cozinha alerta sobre novos itens
                atendente: atendenteAtual, // O último a mexer "assume" o card na Opção A
                ultima_atualizacao: new Date().toLocaleTimeString()
            });
            alert("Itens adicionados à mesa!");
        } else {
            // CRIA NOVA CONTA (Primeiro atendimento)
            await push(dbRef, {
                mesa: mesaNome,
                atendente: atendenteAtual, 
                itens: carrinho,
                status: "pendente",
                hora: new Date().toLocaleTimeString(),
                total: carrinho.reduce((acc, i) => acc + i.preco, 0)
            });
            alert("Mesa aberta com sucesso!");
        }

        carrinho = []; atualizarCarrinho(); voltarParaDashboard();
    } catch (e) { alert("Erro ao salvar pedido."); }
};

// --- MONITORAMENTO COM OPÇÃO A ---
function ouvirPedidos() {
    const atendenteLogado = localStorage.getItem('atendente');
    onValue(ref(db, 'pedidos'), (snap) => {
        const cont = document.getElementById('lista-pedidos-geral');
        cont.innerHTML = "";
        const peds = snap.val();
        if (peds) {
            let temMeus = false;
            Object.keys(peds).forEach(id => {
                const p = peds[id];
                // Opção A: Só vejo se eu for o 'atendente' atual/responsável
                if (p.atendente === atendenteLogado && p.status !== 'finalizado') {
                    temMeus = true;
                    const idLista = `detalhes-${id}`;
                    const card = document.createElement('div');
                    card.className = `card pedido-status-${p.status}`;
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between"><strong>${p.mesa}</strong> <small>${p.hora}</small></div>
                        <button onclick="toggleDetalhes('${idLista}')" style="width:100%; margin: 10px 0; padding: 6px; font-size: 11px; background: #eee; border:none; border-radius:5px;">📋 VER ITENS (${p.itens.length})</button>
                        <div id="${idLista}" style="display:none; font-size:12px; color:#444; background: #fafafa; padding: 8px; border-radius: 5px; margin-bottom: 10px; border: 1px solid #ddd;">
                            ${p.itens.map(i => `• ${i.nome}`).join('<br>')}
                            <div style="margin-top:5px; font-weight:bold">Total Acumulado: R$ ${p.total.toFixed(2)}</div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;">
                            <button onclick="mudarStatus('${id}','preparando')" style="font-size:10px; padding:8px;">Preparo</button>
                            <button onclick="mudarStatus('${id}','entregue')" style="font-size:10px; padding:8px;">Entregue</button>
                            <button onclick="mudarStatus('${id}','finalizado')" style="font-size:10px; padding:8px; background:#fdd;">Fechar</button>
                        </div>`;
                    cont.appendChild(card);
                }
            });
            if (!temMeus) cont.innerHTML = "<p class='loading-msg'>Você não tem mesas ativas agora.</p>";
        } else { cont.innerHTML = "<p class='loading-msg'>Sem pedidos ativos.</p>"; }
    });
}

window.toggleDetalhes = (id) => {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.mudarStatus = async (id, st) => {
    if (st === 'finalizado') {
        if (confirm("Fechar conta desta mesa? Os dados serão salvos no histórico.")) {
            await update(ref(db, `pedidos/${id}`), { 
                status: 'finalizado',
                fechado_em: new Date().toLocaleString()
            });
        }
    } else {
        await update(ref(db, `pedidos/${id}`), { status: st });
    }
};