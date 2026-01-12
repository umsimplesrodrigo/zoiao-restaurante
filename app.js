import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Normalização para evitar nomes duplicados "sujos"
function normalizar(nome) {
    return nome.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
}

window.fazerLogin = async function() {
    const nomeInput = document.getElementById('nome-atendente').value;
    if (!nomeInput) return alert("Digite seu nome!");

    const slug = normalizar(nomeInput);
    const atendenteRef = ref(db, 'atendentes/' + slug);

    try {
        const snap = await get(atendenteRef);
        if (!snap.exists()) {
            await set(atendenteRef, { nome_exibicao: nomeInput, slug: slug });
        }
        localStorage.setItem('atendente_slug', slug);
        localStorage.setItem('atendente_nome', nomeInput);
        
        document.getElementById('user-display').innerText = nomeInput;
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('tela-mesas').style.display = 'block';
    } catch (e) { alert("Erro ao acessar banco."); }
};

window.salvarPedido = async function(mesa, itens, total) {
    const slug = localStorage.getItem('atendente_slug');
    const novoPedidoRef = push(ref(db, 'pedidos'));
    
    const dados = {
        id_pedido: novoPedidoRef.key,
        atendente: slug,
        mesa: mesa,
        itens: itens,
        total: total,
        timestamp: new Date().toISOString(),
        status: "aberto"
    };

    try {
        await set(novoPedidoRef, dados);
        alert("Sucesso! Pedido da Mesa " + mesa + " enviado.");
    } catch (e) { alert("Erro ao salvar."); }
};