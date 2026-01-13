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

// --- NAVEGAÇÃO E LOGIN ---
window.fazerLogin = function() {
    const nome = document.getElementById('nome-atendente').value;
    if(!nome) return alert("Digite seu nome!");
    localStorage.setItem('atendente', nome);
    document.getElementById('user-display').innerText = nome;
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-mesas').style.display = 'block';
    gerarMesas();
    carregarDadosCardapio();
};

window.abrirMesa = function(n) {
    document.getElementById('mesa-titulo').innerText = "Mesa " + n;
    document.getElementById('mesa-titulo').dataset.numero = n;
    document.getElementById('tela-mesas').style.display = 'none';
    document.getElementById('tela-pedido').style.display = 'block';
};

window.voltarParaMesas = function() {
    document.getElementById('tela-pedido').style.display = 'none';
    document.getElementById('tela-mesas').style.display = 'block';
};

// --- LÓGICA DO CARDÁPIO POR ABAS ---
async function carregarDadosCardapio() {
    const snap = await get(ref(db, 'produtos'));
    if(snap.exists()) {
        dadosCardapio = snap.val();
        renderizarAbas();
    }
}

function renderizarAbas() {
    const container = document.getElementById('tabs-categorias');
    container.innerHTML = "";
    Object.keys(dadosCardapio).forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = "tab-btn" + (index === 0 ? " active" : "");
        btn.innerText = cat;
        btn.onclick = (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarProdutos(cat);
        };
        container.appendChild(btn);
    });
    renderizarProdutos(Object.keys(dadosCardapio)[0]); // Inicia na primeira categoria
}

function renderizarProdutos(categoria) {
    const container = document.getElementById('produtos-container');
    container.innerHTML = "";
    const itens = dadosCardapio[categoria];
    for(let id in itens) {
        const p = itens[id];
        const btn = document.createElement('button');
        btn.className = "produto-btn";
        btn.innerHTML = `<span>${p.nome}</span> <strong>R$ ${p.preco.toFixed(2)}</strong>`;
        btn.onclick = () => adicionarAoCarrinho(p.nome, p.preco);
        container.appendChild(btn);
    }
}

// --- CARRINHO E ENVIO ---
function adicionarAoCarrinho(nome, preco) {
    carrinho.push({ nome, preco });
    atualizarCarrinhoHTML();
}

window.removerItem = function(i) {
    carrinho.splice(i, 1);
    atualizarCarrinhoHTML();
};

function atualizarCarrinhoHTML() {
    const ul = document.getElementById('lista-carrinho-ul');
    ul.innerHTML = carrinho.length ? "" : '<li class="empty-msg">Nenhum item adicionado</li>';
    let total = 0;
    carrinho.forEach((item, i) => {
        total += item.preco;
        ul.innerHTML += `<li>${item.nome} <span>R$ ${item.preco.toFixed(2)} <b onclick="removerItem(${i})" style="color:red; margin-left:10px">X</b></span></li>`;
    });
    document.getElementById('total-pedido').innerText = `R$ ${total.toFixed(2)}`;
}

window.enviarPedidoFinal = async function() {
    if(!carrinho.length) return alert("Adicione itens!");
    const mesa = document.getElementById('mesa-titulo').dataset.numero;
    const atendente = localStorage.getItem('atendente');
    const novoPedidoRef = push(ref(db, 'pedidos'));
    await set(novoPedidoRef, {
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

function gerarMesas() {
    const grid = document.getElementById('grid-mesas');
    grid.innerHTML = "";
    for(let i=1; i<=15; i++) {
        const div = document.createElement('div');
        div.className = "mesa-btn";
        div.innerText = "Mesa " + i;
        div.onclick = () => window.abrirMesa(i);
        grid.appendChild(div);
    }
}