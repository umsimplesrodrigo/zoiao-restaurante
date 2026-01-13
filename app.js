import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUVjaNWqQcax68Vvk8VoBJGfoiL98-L88",
  authDomain: "zoiao-restaurante.firebaseapp.com",
  databaseURL: "https://zoiao-restaurante-default-rtdb.firebaseio.com",
  projectId: "zoiao-restaurante",
  storageBucket: "zoiao-restaurante.firebasestorage.app",
  messagingSenderId: "975025400792",
  appId: "1:975025400792:web:7c937c8d6cef32044420ad"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let carrinho = [];
const cardapioData = {
    "Cervejas": [
        { nome: "Heineken", preco: 18.00 },
        { nome: "Skol", preco: 10.00 },
        { nome: "Spaten", preco: 20.00 },
        { nome: "Amstel", preco: 20.00 }
    ],
    "Tira Gosto": [
        { nome: "Batata Frita", preco: 35.00 },
        { nome: "Isca de Peixe", preco: 70.00 },
        { nome: "Carne do Sol c/ Aipim", preco: 90.00 },
        { nome: "Agulhinha", preco: 70.00 }
    ],
    "Almoço (2 Pessoas)": [
        { nome: "Moqueca Badejo (2P)", preco: 170.00 },
        { nome: "Arroz de Polvo (2P)", preco: 150.00 },
        { nome: "Bife Acebolado (2P)", preco: 130.00 }
    ]
};

// Funções Globais
window.fazerLogin = function() {
    const nome = document.getElementById('nome-atendente').value;
    if(!nome) return alert("Quem é você?");
    localStorage.setItem('atendente', nome);
    document.getElementById('user-display').innerText = nome;
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-mesas').style.display = 'block';
    renderizarMesas();
};

function renderizarMesas() {
    const container = document.getElementById('grid-mesas-container');
    container.innerHTML = "";
    for(let i=1; i<=15; i++) {
        const div = document.createElement('div');
        div.className = "mesa-btn";
        div.innerText = "Mesa " + i;
        div.onclick = () => abrirPedido(i);
        container.appendChild(div);
    }
}

window.abrirPedido = function(numero) {
    document.getElementById('mesa-selecionada-titulo').innerText = "Mesa " + numero;
    document.getElementById('mesa-selecionada-titulo').dataset.mesa = numero;
    document.getElementById('tela-mesas').style.display = 'none';
    document.getElementById('tela-pedido').style.display = 'block';
    renderizarCategorias();
};

function renderizarCategorias() {
    const container = document.getElementById('categorias-container');
    container.innerHTML = "";
    Object.keys(cardapioData).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = "cat-btn";
        btn.innerText = cat;
        btn.onclick = () => renderizarProdutos(cat);
        container.appendChild(btn);
    });
}

function renderizarProdutos(cat) {
    const container = document.getElementById('produtos-container');
    container.innerHTML = `<h3>${cat}</h3>`;
    cardapioData[cat].forEach(p => {
        const div = document.createElement('div');
        div.className = "prod-item";
        div.innerHTML = `<span>${p.nome}</span> <b>R$ ${p.preco.toFixed(2)}</b>`;
        div.onclick = () => adicionarAoCarrinho(p);
        container.appendChild(div);
    });
}

function adicionarAoCarrinho(p) {
    carrinho.push(p);
    atualizarCarrinhoUI();
}

function atualizarCarrinhoUI() {
    const ul = document.getElementById('lista-pedido-ul');
    ul.innerHTML = "";
    let total = 0;
    carrinho.forEach((item, index) => {
        total += item.preco;
        ul.innerHTML += `<li>${item.nome} <span>R$ ${item.preco.toFixed(2)}</span></li>`;
    });
    document.getElementById('total-pedido').innerText = total.toFixed(2);
}

window.finalizarPedidoParaBanco = async function() {
    if(carrinho.length === 0) return alert("O pedido está vazio!");
    
    const mesa = document.getElementById('mesa-selecionada-titulo').dataset.mesa;
    const atendente = localStorage.getItem('atendente');
    const total = document.getElementById('total-pedido').innerText;

    const novoPedidoRef = push(ref(db, 'pedidos'));
    await set(novoPedidoRef, {
        mesa,
        atendente,
        itens: carrinho,
        total,
        data: new Date().toLocaleString(),
        status: "aberto"
    });

    alert("Pedido da Mesa " + mesa + " enviado!");
    carrinho = [];
    atualizarCarrinhoUI();
    voltarParaMesas();
};

window.voltarParaMesas = () => {
    document.getElementById('tela-pedido').style.display = 'none';
    document.getElementById('tela-mesas').style.display = 'block';
};