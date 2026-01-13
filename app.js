import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
window.fazerLogin = function() {
    const nome = document.getElementById('nome-atendente').value;
    if(!nome) return alert("Digite seu nome!");
    localStorage.setItem('atendente', nome);
    document.getElementById('user-display').innerText = nome;
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-mesas').style.display = 'block';
    
    carregarTudo();
};

async function carregarTudo() {
    // Busca Mesas e Produtos simultaneamente
    const [snapMesas, snapProdutos] = await Promise.all([
        get(ref(db, 'setores_mesas')),
        get(ref(db, 'produtos'))
    ]);

    if(snapMesas.exists()) {
        dadosMesas = snapMesas.val();
        renderizarAbasSetores();
    }
    if(snapProdutos.exists()) {
        dadosCardapio = snapProdutos.val();
        renderizarAbasCategorias();
    }
}

// --- LÓGICA DE MESAS POR SETOR ---
function renderizarAbasSetores() {
    const container = document.getElementById('tabs-setores');
    container.innerHTML = "";
    Object.keys(dadosMesas).forEach((setor, index) => {
        const btn = document.createElement('button');
        btn.className = "tab-btn" + (index === 0 ? " active" : "");
        btn.innerText = setor;
        btn.onclick = () => {
            document.querySelectorAll('#tabs-setores .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarGridMesas(setor);
        };
        container.appendChild(btn);
    });
    renderizarGridMesas(Object.keys(dadosMesas)[0]);
}

function renderizarGridMesas(setor) {
    const grid = document.getElementById('grid-mesas');
    grid.innerHTML = "";
    const mesas = dadosMesas[setor];
    for(let id in mesas) {
        const m = mesas[id];
        const btn = document.createElement('button');
        btn.className = "mesa-btn";
        btn.innerHTML = `<span>Mesa ${m.numero}</span><small>${setor}</small>`;
        btn.onclick = () => abrirPedido(m.label);
        grid.appendChild(btn);
    }
}

// --- LÓGICA DE PEDIDOS ---
function abrirPedido(label) {
    document.getElementById('mesa-titulo').innerText = label;
    document.getElementById('tela-mesas').style.display = 'none';
    document.getElementById('tela-pedido').style.display = 'block';
}

window.voltarParaMesas = () => {
    document.getElementById('tela-pedido').style.display = 'none';
    document.getElementById('tela-mesas').style.display = 'block';
};

// --- CARDÁPIO ---
function renderizarAbasCategorias() {
    const container = document.getElementById('tabs-categorias');
    container.innerHTML = "";
    Object.keys(dadosCardapio).forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = "tab-btn" + (index === 0 ? " active" : "");
        btn.innerText = cat;
        btn.onclick = () => {
            document.querySelectorAll('#tabs-categorias .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarProdutos(cat);
        };
        container.appendChild(btn);
    });
    renderizarProdutos(Object.keys(dadosCardapio)[0]);
}

function renderizarProdutos(cat) {
    const container = document.getElementById('produtos-container');
    container.innerHTML = "";
    const itens = dadosCardapio[cat];
    for(let id in itens) {
        const p = itens[id];
        const btn = document.createElement('button');
        btn.className = "produto-btn";
        btn.innerHTML = `<span>${p.nome}</span> <strong>R$ ${p.preco.toFixed(2)}</strong>`;
        btn.onclick = () => {
            carrinho.push({nome: p.nome, preco: p.preco});
            atualizarCarrinhoHTML();
        };
        container.appendChild(btn);
    }
}

function atualizarCarrinhoHTML() {
    const ul = document.getElementById('lista-carrinho-ul');
    ul.innerHTML = "";
    let total = 0;
    carrinho.forEach((item, i) => {
        total += item.preco;
        ul.innerHTML += `<li>${item.nome} <span>R$ ${item.preco.toFixed(2)} <b onclick="removerItem(${i})" style="color:red; margin-left:10px">X</b></span></li>`;
    });
    document.getElementById('total-pedido').innerText = `R$ ${total.toFixed(2)}`;
}

window.removerItem = (i) => {
    carrinho.splice(i, 1);
    atualizarCarrinhoHTML();
};

window.enviarPedidoFinal = async () => {
    if(!carrinho.length) return alert("Adicione itens!");
    const mesa = document.getElementById('mesa-titulo').innerText;
    const atendente = localStorage.getItem('atendente');
    await push(ref(db, 'pedidos'), {
        mesa, atendente, itens: carrinho,
        total: carrinho.reduce((a,b) => a + b.preco, 0),
        hora: new Date().toLocaleTimeString(),
        status: "aberto"
    });
    alert("Pedido enviado!");
    carrinho = [];
    atualizarCarrinhoHTML();
    voltarParaMesas();
};