import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// --- LOGIN ---
window.fazerLogin = async function() {
    const nomeInput = document.getElementById('nome-atendente').value;
    if (!nomeInput) return alert("Digite seu nome!");
    const slug = nomeInput.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    
    localStorage.setItem('atendente_slug', slug);
    localStorage.setItem('atendente_nome', nomeInput);
    
    document.getElementById('user-display').innerText = nomeInput;
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-mesas').style.display = 'block';
    carregarCardapio(); 
};

// --- CARDÁPIO ---
async function carregarCardapio() {
    const container = document.getElementById('cardapio-itens');
    container.innerHTML = "Carregando cardápio...";
    
    try {
        const snapshot = await get(ref(db, 'produtos'));
        if (snapshot.exists()) {
            const categorias = snapshot.val();
            container.innerHTML = "";
            for (let cat in categorias) {
                container.innerHTML += `<h3 class="cat-titulo">${cat}</h3>`;
                for (let id in categorias[cat]) {
                    const p = categorias[cat][id];
                    const btn = document.createElement('button');
                    btn.className = "produto-btn";
                    btn.innerHTML = `<span>${p.nome}</span> <strong>R$ ${p.preco.toFixed(2)}</strong>`;
                    btn.onclick = () => adicionarAoCarrinho(p.nome, p.preco);
                    container.appendChild(btn);
                }
            }
        }
    } catch (e) { console.error(e); }
}

// --- CARRINHO ---
function adicionarAoCarrinho(nome, preco) {
    carrinho.push({ nome, preco });
    atualizarResumoCarrinho();
}

function atualizarResumoCarrinho() {
    const lista = document.getElementById('lista-pedido-ul');
    const totalSpan = document.getElementById('total-pedido');
    lista.innerHTML = "";
    let total = 0;

    carrinho.forEach((item, index) => {
        total += item.preco;
        lista.innerHTML += `<li>${item.nome} - R$ ${item.preco.toFixed(2)} <button onclick="removerDoCarrinho(${index})">❌</button></li>`;
    });
    totalSpan.innerText = total.toFixed(2);
}

window.removerDoCarrinho = function(index) {
    carrinho.splice(index, 1);
    atualizarResumoCarrinho();
};

// --- SALVAR NO BANCO ---
window.enviarPedidoFinal = async function() {
    if (carrinho.length === 0) return alert("O pedido está vazio!");
    
    const mesa = document.getElementById('mesa-selecionada-titulo').dataset.numero;
    const slug = localStorage.getItem('atendente_slug');
    const novoPedidoRef = push(ref(db, 'pedidos'));
    
    const dados = {
        id_pedido: novoPedidoRef.key,
        atendente: slug,
        mesa: mesa,
        itens: carrinho,
        total: carrinho.reduce((acc, item) => acc + item.preco, 0),
        timestamp: new Date().toISOString(),
        status: "aberto"
    };

    try {
        await set(novoPedidoRef, dados);
        alert("Pedido enviado!");
        carrinho = [];
        atualizarResumoCarrinho();
        window.voltarParaMesas();
    } catch (e) { alert("Erro ao salvar."); }
};