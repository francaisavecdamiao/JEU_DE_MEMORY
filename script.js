/* =========================================================
   1. ESTADO GLOBAL DA APLICAÇÃO
   ========================================================= */
const state = {
  currentScreen: 'home',
  pin: '',
  userName: '',
  isHost: false,
  players: [
    { name: 'Professor (Você)', score: 0, isHost: true }
  ],
  customPairs: [
    { id: 1, itemA: { type: 'text', value: 'Bonjour' }, itemB: { type: 'text', value: 'Olá' } },
    { id: 2, itemA: { type: 'text', value: 'Merci' }, itemB: { type: 'text', value: 'Obrigado' } }
  ],
  cards: [],
  flippedCards: [],
  isLockBoard: false
};

/* =========================================================
   2. GERENCIADOR DE RENDERIZAÇÃO
   ========================================================= */
function setScreen(screenName) {
  state.currentScreen = screenName;
  render();
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  switch (state.currentScreen) {
    case 'home':
      app.innerHTML = renderHome();
      break;
    case 'host_create':
      app.innerHTML = renderHostCreate();
      break;
    case 'host_lobby':
      app.innerHTML = renderHostLobby();
      break;
    case 'student_join':
      app.innerHTML = renderStudentJoin();
      break;
    case 'game':
      app.innerHTML = renderGame();
      break;
    default:
      app.innerHTML = renderHome();
  }
}

/* =========================================================
   3. TELAS
   ========================================================= */
function renderHome() {
  return `
    <div class="card-box">
      <div class="mascot">🎮</div>
      <h2>Jeu de Mémorisation</h2>
      <p style="color:var(--text-light)">Escolha como deseja entrar na partida:</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
        <button class="btn btn-purple btn-block" onclick="startHostFlow()">🎓 Sou Professor (Criar Sala)</button>
        <button class="btn btn-blue btn-block" onclick="setScreen('student_join')">✏️ Sou Aluno (Entrar com PIN)</button>
      </div>
    </div>
  `;
}

function renderHostCreate() {
  const pairsHtml = state.customPairs.map((p, idx) => `
    <div class="pair-card">
      <div class="pair-header">
        <span>Par #${idx + 1}</span>
        ${state.customPairs.length > 2 ? `<button class="btn btn-del" onclick="removePair(${p.id})">Excluir</button>` : ''}
      </div>
      <div class="pair-grid">
        <!-- Lado A -->
        <div class="item-box">
          <select class="type-select" onchange="updateItemType(${p.id}, 'itemA', this.value)">
            <option value="text" ${p.itemA.type === 'text' ? 'selected' : ''}>Texto</option>
            <option value="image" ${p.itemA.type === 'image' ? 'selected' : ''}>Upload Imagem</option>
          </select>
          ${p.itemA.type === 'text' 
            ? `<input type="text" class="input-field input-sm" placeholder="Texto..." value="${p.itemA.value}" oninput="updateItemValue(${p.id}, 'itemA', this.value)">`
            : `<input type="file" accept="image/*" class="input-sm" onchange="handleImageUpload(${p.id}, 'itemA', this)">
               ${p.itemA.value ? `<img src="${p.itemA.value}" class="img-preview">` : ''}`
          }
        </div>

        <!-- Lado B -->
        <div class="item-box">
          <select class="type-select" onchange="updateItemType(${p.id}, 'itemB', this.value)">
            <option value="text" ${p.itemB.type === 'text' ? 'selected' : ''}>Texto</option>
            <option value="image" ${p.itemB.type === 'image' ? 'selected' : ''}>Upload Imagem</option>
          </select>
          ${p.itemB.type === 'text' 
            ? `<input type="text" class="input-field input-sm" placeholder="Texto..." value="${p.itemB.value}" oninput="updateItemValue(${p.id}, 'itemB', this.value)">`
            : `<input type="file" accept="image/*" class="input-sm" onchange="handleImageUpload(${p.id}, 'itemB', this)">
               ${p.itemB.value ? `<img src="${p.itemB.value}" class="img-preview">` : ''}`
          }
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="card-box">
      <div class="mascot">🎓</div>
      <h2>Criar Jogo da Memória</h2>
      <p style="color:var(--text-light); margin-bottom:12px;">Cadastre os pares do jogo:</p>
      
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${pairsHtml}
      </div>

      <button class="btn btn-blue" style="font-size:14px; padding:10px; margin-top:12px;" onclick="addPair()">
        + Adicionar Novo Par
      </button>
    </div>

    <div style="margin-top:16px;">
      <button class="btn btn-purple btn-block" onclick="generateRoomAndPin()">Gerar PIN e Abrir Sala</button>
      <button class="btn btn-block" style="margin-top:8px; background:#ccc; box-shadow:0 4px 0 #aaa;" onclick="setScreen('home')">Voltar</button>
    </div>
  `;
}

function renderHostLobby() {
  const playerList = state.players.map(p => `
    <li style="background:white; padding:8px 12px; border-radius:8px; margin-bottom:6px; font-weight:700;">
      ${p.isHost ? '🎓' : '👤'} ${p.name}
    </li>
  `).join('');

  return `
    <div class="card-box">
      <h2>Sala Criada!</h2>
      <p style="color:var(--text-light)">Passe o PIN abaixo para os alunos:</p>
      
      <div style="font-size:36px; font-family:'Baloo 2'; font-weight:800; color:var(--purple); background:var(--bg); padding:10px; border-radius:12px; margin:12px 0;">
        ${state.pin}
      </div>

      <h3>Alunos Conectados (${state.players.length}):</h3>
      <ul style="list-style:none; padding:0; text-align:left; max-height:150px; overflow-y:auto;">
        ${playerList}
      </ul>
    </div>

    <div style="margin-top:16px;">
      <button class="btn btn-green btn-block" onclick="setScreen('game')">🚀 Iniciar Jogo Agora</button>
    </div>
  `;
}

function renderStudentJoin() {
  return `
    <div class="card-box">
      <div class="mascot">✏️</div>
      <h2>Entrar na Sala</h2>
      
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:14px;">
        <input type="text" id="student-name" class="input-field" placeholder="Seu Nome / Apelido">
        <input type="number" id="student-pin" class="input-field" placeholder="PIN da Sala (6 dígitos)">
        <button class="btn btn-blue btn-block" onclick="joinRoom()">Entrar no Jogo</button>
      </div>
    </div>

    <div style="margin-top:16px;">
      <button class="btn btn-block" style="background:#ccc; box-shadow:0 4px 0 #aaa;" onclick="setScreen('home')">Voltar</button>
    </div>
  `;
}

// TABULEIRO DO ALUNO COM AS CARTAS ESCONDIDAS
function renderGame() {
  const cardsGrid = state.cards.map((c, index) => `
    <div class="memory-card" id="card-${index}" onclick="flipCard(${index})">
      <div class="card-inner">
        <!-- VERSO ESCONDIDO DA CARTA -->
        <div class="card-back">❓</div>
        <!-- FRENTE REVELADA DA CARTA -->
        <div class="card-front">
          ${c.type === 'image' ? `<img src="${c.val}" alt="imagem">` : `<span>${c.val}</span>`}
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="card-box" style="max-width:600px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-weight:700; color:var(--purple);">PIN: ${state.pin}</span>
        <span style="font-weight:700; color:var(--green);" id="score-display">Pontos: 0</span>
      </div>

      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px;">
        ${cardsGrid}
      </div>
    </div>
  `;
}

/* =========================================================
   4. FUNÇÕES DE CADASTRO E UPLOAD
   ========================================================= */
function startHostFlow() {
  state.isHost = true;
  setScreen('host_create');
}

function addPair() {
  state.customPairs.push({
    id: Date.now(),
    itemA: { type: 'text', value: '' },
    itemB: { type: 'text', value: '' }
  });
  render();
}

function removePair(id) {
  state.customPairs = state.customPairs.filter(p => p.id !== id);
  render();
}

function updateItemType(id, itemKey, type) {
  const pair = state.customPairs.find(p => p.id === id);
  if (pair) {
    pair[itemKey].type = type;
    pair[itemKey].value = '';
    render();
  }
}

function updateItemValue(id, itemKey, value) {
  const pair = state.customPairs.find(p => p.id === id);
  if (pair) {
    pair[itemKey].value = value;
  }
}

// Converte a imagem enviada do PC do professor para Base64
function handleImageUpload(id, itemKey, input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const pair = state.customPairs.find(p => p.id === id);
    if (pair) {
      pair[itemKey].value = e.target.result;
      render();
    }
  };
  reader.readAsDataURL(file);
}

function generateRoomAndPin() {
  const invalid = state.customPairs.some(p => !p.itemA.value.trim() || !p.itemB.value.trim());
  if (invalid) {
    alert("Por favor, preencha todos os textos ou envie as imagens de todos os pares!");
    return;
  }

  state.pin = Math.floor(100000 + Math.random() * 900000).toString();
  
  let cards = [];
  state.customPairs.forEach(p => {
    cards.push({ pairId: p.id, type: p.itemA.type, val: p.itemA.value });
    cards.push({ pairId: p.id, type: p.itemB.type, val: p.itemB.value });
  });

  state.cards = cards.sort(() => Math.random() - 0.5);
  setScreen('host_lobby');
}

function joinRoom() {
  const name = document.getElementById('student-name').value;
  const pin = document.getElementById('student-pin').value;

  if (!name.trim() || !pin.trim()) {
    alert("Preencha seu nome e o PIN correto!");
    return;
  }

  state.userName = name;
  state.pin = pin;
  state.isHost = false;
  setScreen('game');
}

/* =========================================================
   5. LÓGICA DE JOGO DA MEMÓRIA (VIRAR E COMPARAR CARTAS)
   ========================================================= */
function flipCard(index) {
  if (state.isLockBoard) return;
  
  const cardElement = document.getElementById(`card-${index}`);
  if (cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) return;

  cardElement.classList.add('flipped');
  state.flippedCards.push({ index, pairId: state.cards[index].pairId });

  if (state.flippedCards.length === 2) {
    checkMatch();
  }
}

function checkMatch() {
  state.isLockBoard = true;
  const [card1, card2] = state.flippedCards;

  if (card1.pairId === card2.pairId) {
    // ACERTOU O PAR
    document.getElementById(`card-${card1.index}`).classList.add('matched');
    document.getElementById(`card-${card2.index}`).classList.add('matched');
    resetTurn();
  } else {
    // ERROU: Aguarda 1 segundo e desvira as cartas
    setTimeout(() => {
      document.getElementById(`card-${card1.index}`).classList.remove('flipped');
      document.getElementById(`card-${card2.index}`).classList.remove('flipped');
      resetTurn();
    }, 1000);
  }
}

function resetTurn() {
  state.flippedCards = [];
  state.isLockBoard = false;
}

document.addEventListener('DOMContentLoaded', () => {
  render();
});
