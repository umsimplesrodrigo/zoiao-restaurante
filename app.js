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

// --- INICIALIZAÇÃO E AUTO-LOGIN ---
window.onload = () => {
    const salvo = localStorage.getItem('atendente');
    if(salvo) {
        document.getElementById('nome-atendente').value = salvo;
        fazerLogin();
    }
};

window.fazerLogin = function() {
    const nome = document.getElementById('nome-atendente').value;
    if(!nome) return alert("Digite seu nome");
    localStorage.setItem('atendente', nome);
    document.getElementById('user-display').innerText = nome;
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-dashboard').style.display = 'block';
    carregarDadosBase();
    ouvirPedidos();
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

// --- DADOS E MESAS ---
async function carregarDadosBase() {
    const [snM, snP] = await Promise.all([get(ref(db, 'setores_mesas')), get(ref(db, 'produtos'))]);
    if(snM.exists()) { dadosMesas = snM.val(); montarSetores(); }
    if(snP.exists()) { dadosCardapio = snP.val(); montarCategorias(); }
}

function montarSetores() {
    const cont = document.getElementById('tabs-setores');
    cont.innerHTML = "";
    Object.keys(dadosMesas).forEach((s, i) => {
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
    renderizarGrid(Object.keys(dadosMesas)[0]);
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
        };
        grid.appendChild(btn);
    }
}

// --- CARDÁPIO E PEDIDOS ---
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
        ul.innerHTML += `<li>${item.nome} <b onclick="removerItem(${i})" style="color:red">X</b></li>`;
    });
    document.getElementById('total-pedido').innerText = `R$ ${total.toFixed(2)}`;
}

window.removerItem = (i) => { carrinho.splice(i,1); atualizarCarrinho(); };

window.enviarPedidoFinal = async () => {
    if(!carrinho.length) return alert("Vazio!");
    await push(ref(db, 'pedidos'), {
        mesa: document.getElementById('mesa-titulo').innerText,
        atendente: localStorage.getItem('atendente'),
        itens: carrinho,
        status: "pendente",
        hora: new Date().toLocaleTimeString()
    });
    alert("Pedido Enviado!");
    carrinho = []; atualizarCarrinho(); voltarParaDashboard();
};

// --- GESTÃO DE STATUS ---
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
                    <strong>${p.mesa}</strong> - <small>${p.status}</small>
                    <div class="grid-status-btns">
                        <button onclick="mudarStatus('${id}','preparando')">Prep.</button>
                        <button onclick="mudarStatus('${id}','entregue')">Entregue</button>
                        <button onclick="mudarStatus('${id}','finalizado')">Fechar</button>
                    </div>
                `;
                cont.appendChild(card);
            });
        }
    });
}

window.mudarStatus = (id, st) => {
    if(st === 'finalizado') {
        if(confirm("Fechar conta e liberar mesa?")) remove(ref(db, `pedidos/${id}`));
    } else {
        update(ref(db, `pedidos/${id}`), { status: st });
    }
};