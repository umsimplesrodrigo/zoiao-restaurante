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

// --- AUTO-LOGIN ---
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

// --- CARREGAMENTO DE DADOS (COM VERIFICAÇÃO DE EXISTÊNCIA) ---
async function carregarDadosBase() {
    try {
        const [snM, snP] = await Promise.all([
            get(ref(db, 'setores_mesas')), 
            get(ref(db, 'produtos'))
        ]);
        
        if(snM.exists()) { 
            dadosMesas = snM.val(); 
            montarSetores(); 
        } else {
            document.getElementById('grid-mesas').innerHTML = "<p class='loading-msg'>Nenhum setor/mesa cadastrado. Use o script Python.</p>";
        }

        if(snP.exists()) { 
            dadosCardapio = snP.val(); 
            montarCategorias(); 
        } else {
            document.getElementById('produtos-container').innerHTML = "<p class='loading-msg'>Cardápio vazio no banco.</p>";
        }
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    }
}

// --- LÓGICA DE MESAS ---
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
    const mesas = dadosMesas[s];
    for(let id in mesas) {
        const m = mesas[id];
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

// --- CARDÁPIO ---
function montarCategorias() {
    const cont = document.getElementById('tabs-categorias');
    cont.innerHTML = "";
    const categorias = Object.keys(dadosCardapio);
    categorias.forEach((c, i) => {
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
    renderizarProdutos(categorias[0]);
}

function renderizarProdutos(c) {
    const cont = document.getElementById('produtos-container');
    cont.innerHTML = "";
    const itens = dadosCardapio[c];
    for(let id in itens) {
        const p = itens[id];
        const btn = document.createElement('button');
        btn.className = "produto-btn";
        btn.innerHTML = `<span>${p.nome}</span> <strong>R$ ${p.preco.toFixed(2)}</strong>`;
        btn.onclick = () => { carrinho.push(p); atualizarCarrinho(); };
        cont.appendChild(btn);
    }
}

// --- CARRINHO ---
function atualizarCarrinho() {
    const ul = document.getElementById('lista-carrinho-ul');
    ul.innerHTML = "";
    let total = 0;
    carrinho.forEach((item, i) => {
        total += item.preco;
        ul.innerHTML += `<li>${item.nome} <span>R$ ${item.preco.toFixed(2)} <b onclick="removerItem(${i})" style="color:red; margin-left:10px; cursor:pointer">X</b></span></li>`;
    });
    document.getElementById('total-pedido').innerText = `R$ ${total.toFixed(2)}`;
}

window.removerItem = (i) => { carrinho.splice(i,1); atualizarCarrinho(); };

window.enviarPedidoFinal = async () => {
    if(!carrinho.length) return alert("Adicione itens!");
    const mesa = document.getElementById('mesa-titulo').innerText;
    const atendente = localStorage.getItem('atendente');
    
    try {
        await push(ref(db, 'pedidos'), {
            mesa,
            atendente,
            itens: carrinho,
            total: carrinho.reduce((a,b) => a+b.preco, 0),
            status: "pendente",
            hora: new Date().toLocaleTimeString()
        });
        alert("Pedido Enviado para a Cozinha!");
        carrinho = [];
        atualizarCarrinho();
        voltarParaDashboard();
    } catch (e) {
        alert("Erro ao enviar: " + e.message);
    }
};

// --- GESTÃO DE STATUS (LISTA MEUS PEDIDOS) ---
function ouvirPedidos() {
    onValue(ref(db, 'pedidos'), (snap) => {
        const cont = document.getElementById('lista-pedidos-geral');
        cont.innerHTML = "";
        const peds = snap.val();
        
        if(!peds) {
            cont.innerHTML = "<p class='loading-msg'>Nenhum pedido ativo.</p>";
            return;
        }

        Object.keys(peds).forEach(id => {
            const p = peds[id];
            const card = document.createElement('div');
            card.className = `card pedido-status-${p.status}`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <strong>${p.mesa}</strong>
                    <small>${p.hora}</small>
                </div>
                <div style="font-size:13px; margin:5px 0">${p.itens.map(i => i.nome).join(', ')}</div>
                <div style="font-size:12px; color: #666">Status atual: <b>${p.status.toUpperCase()}</b></div>
                <div class="grid-status-btns">
                    <button onclick="mudarStatus('${id}','preparando')">⏳ Prep.</button>
                    <button onclick="mudarStatus('${id}','entregue')">✅ Entregar</button>
                    <button onclick="mudarStatus('${id}','finalizado')" style="background:#fdd">🏁 Fechar</button>
                </div>
            `;
            cont.appendChild(card);
        });
    });
}

window.mudarStatus = async (id, st) => {
    if(st === 'finalizado') {
        if(confirm("Deseja fechar a conta e liberar a mesa?")) {
            await remove(ref(db, `pedidos/${id}`));
        }
    } else {
        await update(ref(db, `pedidos/${id}`), { status: st });
    }
};