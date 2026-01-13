import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const container = document.getElementById('container-pedidos-cozinha');

// Monitorar todos os pedidos do banco
onValue(ref(db, 'pedidos'), (snapshot) => {
    container.innerHTML = "";
    const pedidos = snapshot.val();

    if (!pedidos) {
        container.innerHTML = '<p class="loading">Nenhum pedido pendente no momento.</p>';
        return;
    }

    // Transformar objeto em array e filtrar apenas o que NÃO está entregue ou finalizado
    const listaParaCozinha = Object.keys(pedidos)
        .map(id => ({ id, ...pedidos[id] }))
        .filter(p => p.status === 'pendente' || p.status === 'preparando');

    if (listaParaCozinha.length === 0) {
        container.innerHTML = '<p class="loading">✅ Tudo pronto por aqui!</p>';
        return;
    }

    listaParaCozinha.forEach(pedido => {
        const card = document.createElement('div');
        card.className = `card-pedido ${pedido.status}`;

        const textoBotao = pedido.status === 'pendente' ? 'Começar Preparo' : 'Pedido Pronto';
        const classeBotao = pedido.status === 'pendente' ? 'btn-preparar' : 'btn-pronto';
        const novoStatus = pedido.status === 'pendente' ? 'preparando' : 'entregue';

        card.innerHTML = `
            <div class="header-card">
                <span>${pedido.mesa}</span>
                <span>${pedido.hora}</span>
            </div>
            <div class="atendente-tag">Garçom: ${pedido.atendente}</div>
            <ul class="lista-itens">
                ${pedido.itens.map(item => `<li>• ${item.nome}</li>`).join('')}
            </ul>
            <button class="btn-status ${classeBotao}" onclick="atualizarStatusCozinha('${pedido.id}', '${novoStatus}')">
                ${textoBotao}
            </button>
        `;
        container.appendChild(card);
    });
});

// Função para mudar o status (acessível globalmente)
window.atualizarStatusCozinha = async (id, status) => {
    try {
        await update(ref(db, `pedidos/${id}`), { status: status });
    } catch (e) {
        alert("Erro ao atualizar status.");
    }
};