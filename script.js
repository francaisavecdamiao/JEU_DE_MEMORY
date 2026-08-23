/* =========================================================
   1. ESTADO GLOBAL DA APLICAÇÃO
   ========================================================= */
const state = {
  currentScreen: 'home',
  pin: '',
  userName: '',
  selectedChar: 'MARIE',
  selectedSkin: 'padrao',
  avatarUrl: 'assets/MARIE.png',
  score: 0,
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
      
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
        <input type="text" id="student-name" class="input-field" placeholder="Seu Nickname / Apelido" value="${state.userName}">
        <input type="number" id="student-pin" class="input-field" placeholder="PIN da Sala (6 dígitos)" value="${state.pin}">
        
        <div class="avatar-selection-box">
          <div style="width:100%; text-align:left;">
            <label style="font-weight:700; font-size:13px; color:var(--text-light);">Escolha seu Personagem:</label>
            <select id="select-char" class="input-field" style="margin-top:4px;" onchange="updateAvatarDOM()">
              <option value="MARIE" ${state.selectedChar === 'MARIE' ? 'selected' : ''}>Marie</option>
              <option value="MATHIEU" ${state.selectedChar === 'MATHIEU' ? 'selected' : ''}>Mathieu</option>
            </select>
          </div>

          <div style="width:100%; text-align:left;">
            <label style="font-weight:700; font-size:13px; color:var(--text-light);">Escolha a Variação (Skin):</label>
            <select id="select-skin" class="input-field" style="margin-top:4px;" onchange="updateAvatarDOM()">
              <option value="padrao" ${state.selectedSkin === 'padrao' ? 'selected' : ''}>Visual Padrão</option>
              <option value="01" ${state.selectedSkin === '01' ? 'selected' : ''}>Roupa 01</option>
              <option value="02" ${state.selectedSkin === '02' ? 'selected' : ''}>Roupa 02</option>
            </select>
          </div>

          <div class="avatar-preview-container">
            <img id="avatar-img-preview" src="${state.avatarUrl}" alt="Preview Personagem" onerror="this.src='https://via.placeholder.com/90?text=Avatar'">
          </div>
        </div>

        <button class="btn btn-blue btn-block" onclick="joinRoom()">Entrar no Jogo</button>
      </div>
    </div>

    <div style="margin-top:16px;">
      <button class="btn btn-block" style="background:#ccc; box-shadow:0 4px 0 #aaa;" onclick="setScreen('home')">Voltar</button>
    </div>
  `;
}

// Atualiza o DOM do avatar sem chamar a função render() novamente
function updateAvatarDOM() {
  const char = document.getElementById('select-char').value;
  const skin = document.getElementById('select-skin').value;

  state.selectedChar = char;
  state.selectedSkin = skin;

  if (skin === 'padrao') {
    state.avatarUrl = `assets/${char}.png`;
  } else {
    state.avatarUrl = `assets/${char}${skin}.png`;
  }

  const imgEl = document.getElementById('avatar-img-preview');
  if (imgEl) {
    imgEl.src = state.avatarUrl;
  }
}

function renderGame() {
  const cardsGrid = state.cards.map((c, index) => `
    <div class="memory-card" id="card-${index}" onclick="flipCard(${index})">
      <div class="card-inner">
        <div class="card-back">❓</div>
        <div class="card-front">
          ${c.type === 'image' ? `<img src="${c.val}" alt="imagem">` : `<span>${c.val}</span>`}
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="card-box" style="max-width:600px;">
      <div class="player-hud">
        <div class="player-info">
          <img src="${state.avatarUrl}" class="hud-avatar" alt="Avatar" onerror="this.src='https://via.placeholder.com/40?text=A'">
          <span class="hud-nickname">${state.userName || 'Jogador'}</span>
        </div>
        <span style="font-weight:700; color:var(--purple);">PIN: ${state.pin}</span>
      </div>

      <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:12px;">
        <span style="font-weight:700; color:var(--green);" id="score-display">Pontos: ${state.score}</span>
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
  const nameInput = document.getElementById('student-name');
  const pinInput = document.getElementById('student-pin');

  const name = nameInput ? nameInput.value : '';
  const pin = pinInput ? pinInput.value : '';

  if (!name.trim() || !pin.trim()) {
    alert("Preencha seu Nickname e o PIN correto!");
    return;
  }

  state.userName = name;
  state.pin = pin;
  state.isHost = false;

  // Garante a geração de cartas caso entre sem ser pelo fluxo do professor
  if (state.cards.length === 0) {
    let cards = [];
    state.customPairs.forEach(p => {
      cards.push({ pairId: p.id, type: p.itemA.type, val: p.itemA.value });
      cards.push({ pairId: p.id, type: p.itemB.type, val: p.itemB.value });
    });
    state.cards = cards.sort(() => Math.random() - 0.5);
  }

  setScreen('game');
}

/* =========================================================
   5. LÓGICA DE JOGO DA MEMÓRIA
   ========================================================= */
function flipCard(index) {
  if (state.isLockBoard) return;
  
  const cardElement = document.getElementById(`card-${index}`);
  if (!cardElement || cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) return;

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
    document.getElementById(`card-${card1.index}`).classList.add('matched');
    document.getElementById(`card-${card2.index}`).classList.add('matched');
    state.score += 10;
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) scoreEl.innerText = `Pontos: ${state.score}`;
    resetTurn();
  } else {
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
