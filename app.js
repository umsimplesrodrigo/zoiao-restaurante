import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// --- AUTO-LOGIN E CRIAÇÃO DE NÓ ---
window.onload = () => {
    const salvo = localStorage.getItem('atendente');
    if(salvo) {
        document.getElementById('nome-atendente').value = salvo;
        fazerLogin();
    }
};

window.fazerLogin = async function() {
    const nome = document.getElementById('nome-atendente').value;
    if(!nome) return alert("Digite seu nome");
    
    // Cria um slug (id limpo) para o atendente
    const slug = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    
    try {
        // FORÇA A CRIAÇÃO DO NÓ ATENDENTES NO FIREBASE
        await set(ref(db, 'atendentes/' + slug), {
            nome_exibicao: nome,
            ultimo_acesso: new Date().toLocaleString()
        });

        localStorage.setItem('atendente', nome);
        document.getElementById('user-display').innerText = nome;
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('tela-dashboard').style.display = 'block';
        
        carregarDadosBase();
        ouvirPedidos();
    } catch (e) {
        alert("Erro ao registrar no banco: " + e.message);
    }
};

window.logout = () => {
    localStorage.removeItem('atendente');
    location.reload();
};

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

// --- CARREGAMENTO DE MESAS E PRODUTOS ---
async function carregarDadosBase() {
    const [snM, snP] = await Promise.all([get(ref(db, 'setores_mesas')), get(ref(db, 'produtos'))]);
    if(snM.exists()) { dadosMesas = snM.val(); montarSetores(); }
    if(snP.exists()) { dadosCardapio = snP.val(); montarCategorias(); }
}

function montarSetores() {
    const cont = document.getElementById('tabs-setores');
    cont.innerHTML = "";
    const setores = Object.keys(dadosMesas);
    setores.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = "tab-btn" + (i===0?" active":"");
        btn.innerText = s;
        btn.onclick = () => {
            document.querySelectorAll('#tabs-setores .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarGrid(s);
        };
        cont.appendChild(btn);
    });
    renderizarGrid(setores[0]);
}

function renderizarGrid(s) {
    const grid = document.getElementById('grid-mesas');
    grid.innerHTML = "";
    for(let id in dadosMesas[s]) {
        const m = dadosMesas[s][id];
        const btn = document.createElement('button');
        btn.className = "mesa-btn";
        btn.innerText = "Mesa " + m.numero;
        btn.onclick = () => {
            document.getElementById('mesa-titulo').innerText = s + " - Mesa " + m.numero;
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
        btn.className = "tab-btn" + (i===0?" active":"");
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

function renderizarProdutos(c) {
    const cont = document.getElementById('produtos-container');
    cont.innerHTML = "";
    for(let id in dadosCardapio[c]) {
        const p = dadosCardapio[c][id];
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
        ul.innerHTML += `<li style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee;">
            ${item.nome} <b onclick="removerItem(${i})" style="color:red; cursor:pointer;">X</b>
        </li>`;
    });
    document.getElementById('total-pedido').innerText = `R$ ${total.toFixed(2)}`;
}

window.removerItem = (i) => { carrinho.splice(i,1); atualizarCarrinho(); };

window.enviarPedidoFinal = async () => {
    if(!carrinho.length) return alert("Adicione itens!");
    await push(ref(db, 'pedidos'), {
        mesa: document.getElementById('mesa-titulo').innerText,
        atendente: localStorage.getItem('atendente'),
        itens: carrinho,
        status: "pendente",
        hora: new Date().toLocaleTimeString()
    });
    alert("Pedido enviado!");
    carrinho = []; atualizarCarrinho(); voltarParaDashboard();
};

// --- MEUS PEDIDOS EM TEMPO REAL ---
function ouvirPedidos() {
    onValue(ref(db, 'pedidos'), (snap) => {
        const cont = document.getElementById('lista-pedidos-geral');
        cont.innerHTML = "";
        const peds = snap.val();
        if(peds) {
            Object.keys(peds).forEach(id => {
                const p = peds[id];
                const card = document.createElement('div');
                card.className = `card pedido-status-${p.status}`;
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between"><strong>${p.mesa}</strong> <small>${p.hora}</small></div>
                    <div style="font-size:12px; color:#666">${p.itens.map(i => i.nome).join(', ')}</div>
                    <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;">
                        <button onclick="mudarStatus('${id}','preparando')" style="font-size:10px; padding:5px;">⏳ Prep.</button>
                        <button onclick="mudarStatus('${id}','entregue')" style="font-size:10px; padding:5px;">✅ Entregue</button>
                        <button onclick="mudarStatus('${id}','finalizado')" style="font-size:10px; padding:5px; background:#fdd; border:none; border-radius:4px;">🏁 Fechar</button>
                    </div>
                `;
                cont.appendChild(card);
            });
        } else {
            cont.innerHTML = "<p class='loading-msg'>Nenhum pedido ativo.</p>";
        }
    });
}

window.mudarStatus = async (id, st) => {
    if(st === 'finalizado') {
        if(confirm("Deseja encerrar a mesa e remover o pedido?")) await remove(ref(db, `pedidos/${id}`));
    } else {
        await update(ref(db, `pedidos/${id}`), { status: st });
    }
};