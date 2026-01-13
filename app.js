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

// --- LOGIN ---
window.onload = () => {
    const salvo = localStorage.getItem('atendente');
    if (salvo) {
        document.getElementById('nome-atendente').value = salvo;
        fazerLogin();
    }
};

window.fazerLogin = async function() {
    const campoNome = document.getElementById('nome-atendente');
    let nomeLimpo = campoNome.value.trim().replace(/\s+/g, ' ');
    if (!nomeLimpo) return alert("Digite seu nome.");

    const slug = nomeLimpo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');

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
    } catch (e) { alert("Erro ao conectar."); }
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

// --- CARREGAMENTO E ORDENAÇÃO ---
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
    
    // Transformar em array e ordenar numericamente de forma robusta
    const mesasArray = Object.keys(dadosMesas[s]).map(id => ({ id, ...dadosMesas[s][id] }));
    
    mesasArray.sort((a, b) => {
        return Number(a.numero) - Number(b.numero);
    });

    mesasArray.forEach(m => {
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
    });
}

function montarCategorias() {
    const cont = document.getElementById('tabs-categorias');
    cont.innerHTML = "";
    Object.keys(dadosCardapio).sort().forEach((c, i) => {
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
    renderizarProdutos(Object.keys(dadosCardapio).sort()[0]);
}

function renderizarProdutos(cat) {
    const cont = document.getElementById('produtos-container');
    cont.innerHTML = "";
    const prods = dadosCardapio[cat];
    Object.keys(prods).forEach(id => {
        const p = prods[id];
        const btn = document.createElement('button');
        btn.className = "produto-btn";
        btn.innerHTML = `<span>${p.nome}</span> <strong>R$ ${Number(p.preco).toFixed(2)}</strong>`;
        btn.onclick = () => { carrinho.push(p); atualizarCarrinho(); };
        cont.appendChild(btn);
    });
}

function atualizarCarrinho() {
    const ul = document.getElementById('lista-carrinho-ul');
    ul.innerHTML = "";
    let total = 0;
    carrinho.forEach((item, i) => {
        total += Number(item.preco);
        ul.innerHTML += `<li style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
            ${item.nome} <button onclick="removerItem(${i})" style="background:none; border:none; color:red; font-weight:bold; cursor:pointer;">X</button>
        </li>`;
    });
    document.getElementById('total-pedido').innerText = `R$ ${total.toFixed(2)}`;
}

window.removerItem = (i) => { carrinho.splice(i, 1); atualizarCarrinho(); };

// --- ENVIO COM AGRUPAMENTO (EVITA DUPLICADOS) ---
window.enviarPedidoFinal = async () => {
    if (!carrinho.length) return alert("Carrinho vazio!");
    const atendenteAtual = localStorage.getItem('atendente');
    const mesaNome = document.getElementById('mesa-titulo').innerText;
    
    try {
        const snapshot = await get(ref(db, 'pedidos'));
        let idExistente = null;
        let itensAnteriores = [];

        if (snapshot.exists()) {
            const peds = snapshot.val();
            for (let id in peds) {
                if (peds[id].mesa === mesaNome && peds[id].status !== 'finalizado') {
                    idExistente = id;
                    itensAnteriores = peds[id].itens || [];
                    break;
                }
            }
        }

        if (idExistente) {
            const novosItens = [...itensAnteriores, ...carrinho];
            await update(ref(db, `pedidos/${idExistente}`), {
                itens: novosItens,
                total: novosItens.reduce((acc, i) => acc + Number(i.preco), 0),
                status: 'pendente',
                atendente: atendenteAtual,
                ultima_atualizacao: new Date().toLocaleTimeString()
            });
        } else {
            await push(ref(db, 'pedidos'), {
                mesa: mesaNome,
                atendente: atendenteAtual,
                itens: carrinho,
                status: "pendente",
                hora: new Date().toLocaleTimeString(),
                total: carrinho.reduce((acc, i) => acc + Number(i.preco), 0)
            });
        }
        alert("Pedido enviado!");
        carrinho = []; atualizarCarrinho(); voltarParaDashboard();
    } catch (e) { alert("Erro ao salvar."); }
};

// --- MONITORAMENTO GLOBAL (VISIBILIDADE TOTAL) ---
function ouvirPedidos() {
    onValue(ref(db, 'pedidos'), (snap) => {
        const cont = document.getElementById('lista-pedidos-geral');
        cont.innerHTML = "";
        const peds = snap.val();
        if (peds) {
            Object.keys(peds).forEach(id => {
                const p = peds[id];
                if (p.status !== 'finalizado') {
                    const card = document.createElement('div');
                    card.className = `card pedido-status-${p.status}`;
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between"><strong>${p.mesa}</strong> <small>${p.hora}</small></div>
                        <div style="font-size:11px; color:#666">Atendente: ${p.atendente}</div>
                        <div style="margin:10px 0; font-size:13px; background:#f9f9f9; padding:8px; border-radius:5px;">
                            ${p.itens.map(i => `• ${i.nome}`).join('<br>')}
                            <div style="margin-top:5px; border-top:1px solid #ddd; padding-top:5px"><strong>Total: R$ ${Number(p.total).toFixed(2)}</strong></div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;">
                            <button onclick="mudarStatus('${id}','preparando')" style="font-size:10px; padding:8px; cursor:pointer">Preparo</button>
                            <button onclick="mudarStatus('${id}','entregue')" style="font-size:10px; padding:8px; cursor:pointer">Entregue</button>
                            <button onclick="mudarStatus('${id}','finalizado')" style="font-size:10px; padding:8px; background:#fee; border:1px solid #fcc; cursor:pointer">Fechar</button>
                        </div>`;
                    cont.appendChild(card);
                }
            });
        }
    });
}

window.mudarStatus = async (id, st) => {
    if (st === 'finalizado' && !confirm("Fechar conta?")) return;
    await update(ref(db, `pedidos/${id}`), { status: st });
};