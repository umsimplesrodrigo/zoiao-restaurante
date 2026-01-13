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

let carrinhoAtual = [];

// --- LOGIN ---
window.fazerLogin = async function() {
    const nome = document.getElementById('nome-atendente').value;
    if(!nome) return alert("Por favor, digite seu nome.");
    
    const slug = nome.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    localStorage.setItem('atendente_slug', slug);
    localStorage.setItem('atendente_nome', nome);
    
    document.getElementById('user-display').innerText = nome;
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-mesas').style.display = 'block';
    
    buscarCardapioFirebase();
};

// --- BUSCAR CARDÁPIO ---
async function buscarCardapioFirebase() {
    const container = document.getElementById('cardapio-dinamico');
    try {
        const snap = await get(ref(db, 'produtos'));
        if(snap.exists()) {
            const dados = snap.val();
            container.innerHTML = "";
            
            for(let categoria in dados) {
                const titulo = document.createElement('div');
                titulo.className = "cat-header";
                titulo.innerText = categoria;
                container.appendChild(titulo);
                
                for(let id in dados[categoria]) {
                    const p = dados[categoria][id];
                    const btn = document.createElement('button');
                    btn.className = "produto-item";
                    btn.innerHTML = `<span>${p.nome}</span> <strong>R$ ${p.preco.toFixed(2)}</strong>`;
                    btn.onclick = () => adicionarItem(p.nome, p.preco);
                    container.appendChild(btn);
                }
            }
        }
    } catch (e) { container.innerHTML = "Erro ao carregar cardápio."; }
}

// --- LÓGICA DO CARRINHO ---
function adicionarItem(nome, preco) {
    carrinhoAtual.push({ nome, preco });
    renderizarCarrinho();
}

window.removerItem = function(index) {
    carrinhoAtual.splice(index, 1);
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const ul = document.getElementById('lista-carrinho-ul');
    const totalSpan = document.getElementById('total-pedido');
    ul.innerHTML = "";
    let total = 0;

    if(carrinhoAtual.length === 0) {
        ul.innerHTML = '<li class="empty-msg">Nenhum item adicionado</li>';
    }

    carrinhoAtual.forEach((item, i) => {
        total += item.preco;
        ul.innerHTML += `<li>${item.nome} (R$ ${item.preco.toFixed(2)}) <span onclick="removerItem(${i})" style="color:red; cursor:pointer;">[X]</span></li>`;
    });

    totalSpan.innerText = `R$ ${total.toFixed(2)}`;
}

// --- FINALIZAR PEDIDO NO FIREBASE ---
window.enviarPedidoFinal = async function() {
    if(carrinhoAtual.length === 0) return alert("Adicione pelo menos um item!");
    
    const mesa = document.getElementById('mesa-titulo').dataset.numero;
    const atendente = localStorage.getItem('atendente_slug');
    const total = carrinhoAtual.reduce((acc, obj) => acc + obj.preco, 0);
    
    const novoPedidoRef = push(ref(db, 'pedidos'));
    const dadosPedido = {
        id: novoPedidoRef.key,
        mesa: mesa,
        atendente: atendente,
        itens: carrinhoAtual,
        total: total,
        timestamp: new Date().toISOString(),
        status: "aberto"
    };

    try {
        await set(novoPedidoRef, dadosPedido);
        alert("✅ Pedido enviado com sucesso para o banco!");
        carrinhoAtual = [];
        renderizarCarrinho();
        window.voltarParaMesas();
    } catch (e) { alert("Erro ao salvar pedido."); }
};