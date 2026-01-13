import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Configuração do seu Firebase
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

// --- 1. CONTROLE DE ACESSO (LOGIN) ---

window.onload = () => {
    const atendenteSalvo = localStorage.getItem('atendente');
    if (atendenteSalvo) {
        document.getElementById('nome-atendente').value = atendenteSalvo;
        fazerLogin();
    }
};

window.fazerLogin = async function() {
    const campoNome = document.getElementById('nome-atendente');
    let nomeBruto = campoNome.value;
    
    // Validação básica
    if (!nomeBruto || nomeBruto.trim() === "") {
        return alert("Por favor, digite seu nome para entrar.");
    }

    // Normalização para evitar duplicatas no banco (Ex: "Yasmin " vs "Yasmin")
    const nomeLimpo = nomeBruto.trim();
    const slug = nomeLimpo.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9\s]/g, "")     // Remove símbolos
        .replace(/\s+/g, '-');           // Troca espaços por traço

    try {
        // Grava/Atualiza o atendente no banco
        await update(ref(db, 'atendentes/' + slug), {
            nome_exibicao: nomeLimpo,
            slug: slug,
            ultimo_acesso: new Date().toLocaleString(),
            status: "online"
        });

        // Persistência local
        localStorage.setItem('atendente', nomeLimpo);
        
        // Interface
        document.getElementById('user-display').innerText = nomeLimpo;
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('tela-dashboard').style.display = 'block';
        
        carregarDadosBase();
        ouvirPedidos();
    } catch (e) {
        console.error("Erro no login:", e);
        alert("Erro ao conectar com o banco de dados.");
    }
};

window.logout = () => {
    localStorage.removeItem('atendente');
    location.reload();
};

// --- 2. NAVEGAÇÃO ---

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

// --- 3. CARREGAMENTO DE DADOS (MESAS E PRODUTOS) ---

async function carregarDadosBase() {
    try {
        const [snM, snP] = await Promise.all([
            get(ref(db, 'setores_mesas')), 
            get(ref(db, 'produtos'))
        ]);
        
        if (snM.exists()) { 
            dadosMesas = snM.val(); 
            montarSetores(); 
        }
        if (snP.exists()) { 
            dadosCardapio = snP.val(); 
            montarCategorias(); 
        }
    } catch (e) {
        console.error("Erro ao carregar mesas/produtos:", e);
    }
}

function montarSetores() {
    const cont = document.getElementById('tabs-setores');
    cont.innerHTML = "";
    const setores = Object.keys(dadosMesas);
    setores.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = "tab-btn" + (i === 0 ? " active" : "");
        btn.innerText = s;
        btn.onclick = () => {
            document.querySelectorAll('#tabs-setores .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarGridMesas(s);
        };
        cont.appendChild(btn);
    });
    renderizarGridMesas(setores[0]);
}

function renderizarGridMesas(setor) {
    const grid = document.getElementById('grid-mesas');
    grid.innerHTML = "";
    const mesas = dadosMesas[setor];
    for (let id in mesas) {
        const m = mesas[id];
        const btn = document.createElement('button');
        btn.className = "mesa-btn";
        btn.innerText = "Mesa " + m.numero;
        btn.onclick = () => abrirMesa(setor, m.numero);
        grid.appendChild(btn);
    }
}

function abrirMesa(setor, numero) {
    document.getElementById('mesa-titulo').innerText = `${setor} - Mesa ${numero}`;
    document.getElementById('tela-dashboard').style.display = 'none';
    document.getElementById('tela-pedido').style.display = 'block';
    carrinho = [];
    atualizarCarrinho();
}

// --- 4. LÓGICA DO CARDÁPIO E CARRINHO ---

function montarCategorias() {
    const cont = document.getElementById('tabs-categorias');
    cont.innerHTML = "";
    const categorias = Object.keys(dadosCardapio);
    categorias.forEach((c, i) => {
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
    renderizarProdutos(categorias[0]);
}

function renderizarProdutos(categoria) {
    const cont = document.getElementById('produtos-container');
    cont.innerHTML = "";
    const itens = dadosCardapio[categoria];
    for (let id in itens) {
        const p = itens[id];
        const btn = document.createElement('button');
        btn.className = "produto-btn";
        btn.innerHTML = `<span>${p.nome}</span> <strong>R$ ${p.preco.toFixed(2)}</strong>`;
        btn.onclick = () => {
            carrinho.push(p);
            atualizarCarrinho();
        };
        cont.appendChild(btn);
    }
}

function atualizarCarrinho() {
    const ul = document.getElementById('lista-carrinho-ul');
    ul.innerHTML = "";
    let total = 0;
    carrinho.forEach((item, i) => {
        total += item.preco;
        ul.innerHTML += `
            <li style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee;">
                <span>${item.nome}</span>
                <span>R$ ${item.preco.toFixed(2)} <b onclick="removerDoCarrinho(${i})" style="color:red; cursor:pointer; margin-left:10px;">X</b></span>
            </li>`;
    });
    document.getElementById('total-pedido').innerText = `R$ ${total.toFixed(2)}`;
}

window.removerDoCarrinho = (index) => {
    carrinho.splice(index, 1);
    atualizarCarrinho();
};

window.enviarPedidoFinal = async () => {
    if (carrinho.length === 0) return alert("O carrinho está vazio!");
    
    const atendenteAtual = localStorage.getItem('atendente');
    const mesaAtual = document.getElementById('mesa-titulo').innerText;

    try {
        await push(ref(db, 'pedidos'), {
            mesa: mesaAtual,
            atendente: atendenteAtual,
            itens: carrinho,
            status: "pendente",
            hora: new Date().toLocaleTimeString(),
            total: carrinho.reduce((acc, item) => acc + item.preco, 0)
        });
        
        alert("Pedido enviado com sucesso!");
        carrinho = [];
        atualizarCarrinho();
        voltarParaDashboard();
    } catch (e) {
        alert("Erro ao enviar pedido ao banco.");
    }
};

// --- 5. MONITORAMENTO DE PEDIDOS (FILTRADO POR ATENDENTE) ---

function ouvirPedidos() {
    const atendenteLogado = localStorage.getItem('atendente');
    const cont = document.getElementById('lista-pedidos-geral');

    onValue(ref(db, 'pedidos'), (snap) => {
        cont.innerHTML = "";
        const todosPedidos = snap.val();
        
        if (!todosPedidos) {
            cont.innerHTML = "<p class='loading-msg'>Nenhum pedido ativo.</p>";
            return;
        }

        let encontrouMeus = false;

        Object.keys(todosPedidos).forEach(id => {
            const p = todosPedidos[id];
            
            // FILTRO: Só exibe se o nome do atendente for idêntico ao logado
            if (p.atendente === atendenteLogado) {
                encontrouMeus = true;
                const card = document.createElement('div');
                card.className = `card pedido-status-${p.status}`;
                card.style.borderLeft = "6px solid " + (p.status === 'pendente' ? '#f1c40f' : p.status === 'preparando' ? '#3498db' : '#2ecc71');
                
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${p.mesa}</strong>
                        <small>${p.hora}</small>
                    </div>
                    <div style="font-size:13px; margin:8px 0; color:#555;">
                        ${p.itens.map(i => i.nome).join(', ')}
                    </div>
                    <div style="font-weight:bold; font-size:14px; margin-bottom:10px;">Total: R$ ${p.total.toFixed(2)}</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;">
                        <button onclick="mudarStatusPedido('${id}','preparando')" style="padding:6px; font-size:11px;">⏳ Preparo</button>
                        <button onclick="mudarStatusPedido('${id}','entregue')" style="padding:6px; font-size:11px;">✅ Entregue</button>
                        <button onclick="mudarStatusPedido('${id}','finalizado')" style="padding:6px; font-size:11px; background:#fdd; border:1px solid #fbb;">🏁 Fechar</button>
                    </div>
                `;
                cont.appendChild(card);
            }
        });

        if (!encontrouMeus) {
            cont.innerHTML = "<p class='loading-msg'>Você não tem pedidos ativos.</p>";
        }
    });
}

window.mudarStatusPedido = async (id, novoStatus) => {
    if (novoStatus === 'finalizado') {
        if (confirm("Deseja fechar a conta e remover este pedido da lista?")) {
            await remove(ref(db, `pedidos/${id}`));
        }
    } else {
        await update(ref(db, `pedidos/${id}`), { status: novoStatus });
    }
};