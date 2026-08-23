/* =========================================================
   1. GERENCIADOR DE ÁUDIO E VOZ (WEB SPEECH API OTIMIZADO)
   ========================================================= */
const sounds = {
  click: new Audio('soundeffects/click.mp3'),
  ok: new Audio('soundeffects/ok.mp3'),
  falha: new Audio('soundeffects/falha.mp3'),
  time: new Audio('soundeffects/time.mp3'),
  alert: new Audio('soundeffects/alert.mp3')
};

function playSound(name) {
  if (sounds[name]) {
    sounds[name].currentTime = 0;
    sounds[name].play().catch(() => {});
  }
}

// Pré-carregamento de vozes para eliminar o delay do navegador
let cachedVoices = [];
function preloadVoices() {
  if ('speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        cachedVoices = window.speechSynthesis.getVoices();
      };
    }
  }
}
preloadVoices();

function speakFrench(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Para áudios anteriores imediatamente
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;

    // Busca preferencialmente uma voz nativa em francês já em cache
    const frenchVoice = cachedVoices.find(voice => voice.lang.includes('fr'));
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

/* =========================================================
   2. CONFIGURAÇÃO E VALIDAÇÃO DO FIREBASE
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyCqLZqaJkIMLJyqRDdXfa8gMjZx8kIwHCw",
  authDomain: "jeu-de-memory.firebaseapp.com",
  databaseURL: "https://jeu-de-memory-default-rtdb.firebaseio.com",
  projectId: "jeu-de-memory",
  storageBucket: "jeu-de-memory.firebasestorage.app",
  messagingSenderId: "429888413918",
  appId: "1:429888413918:web:a3db9a1027e51195b5224f"
};

let db = null;
let isFirebaseActive = false;

try {
  if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && firebaseConfig.apiKey.trim() !== "") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    isFirebaseActive = true;
  }
} catch (e) {
  console.warn("Firebase não ativo. Executando em Modo Offline.");
}

/* =========================================================
   3. ESTADO GLOBAL DA APLICAÇÃO
   ========================================================= */
const initialChar = localStorage.getItem('jeu_char') || 'MARIE';
const initialSkin = localStorage.getItem('jeu_skin') || 'padrao';
const initialFileName = initialSkin === 'padrao' ? initialChar : `${initialChar}${initialSkin}`;

const state = {
  currentScreen: 'home',
  pin: '',
  userName: localStorage.getItem('jeu_nickname') || '',
  selectedChar: initialChar,
  selectedSkin: initialSkin,
  avatarUrl: `assets/${encodeURIComponent(initialFileName)}.png`,
  score: 0,
  attempts: 0,
  timeLeft: 20,
  timerInterval: null,
  timeAudioPlayed: false,
  matchedPairsCount: 0,
  isHost: false,
  players: [],
  currentTurnIndex: 0,
  activePlayerId: null,
  customPairs: [
    { id: 1, itemA: { type: 'text', value: 'Bonjour' }, itemB: { type: 'text', value: 'Olá' } },
    { id: 2, itemA: { type: 'text', value: 'Merci' }, itemB: { type: 'text', value: 'Obrigado' } }
  ],
  cards: [],
  flippedCards: [],
  isLockBoard: false
};

/* =========================================================
   4. RENDERIZAÇÃO
   ========================================================= */
function setScreen(screenName) {
  state.currentScreen = screenName;
  render();
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const firebaseNotice = !isFirebaseActive ? `
    <div style="background:#FFF3CD; color:#856404; padding:8px 12px; border-radius:8px; font-size:12px; margin-bottom:12px; text-align:center; font-weight:700;">
      ⚠️ Modo Offline (sem Firebase). Para jogar multiplayer em rede, insira as chaves no script.js.
    </div>
  ` : '';

  switch (state.currentScreen) {
    case 'home':
      app.innerHTML = firebaseNotice + renderHome();
      break;
    case 'host_create':
      app.innerHTML = firebaseNotice + renderHostCreate();
      break;
    case 'host_lobby':
      app.innerHTML = firebaseNotice + renderHostLobby();
      break;
    case 'teacher_dashboard':
      app.innerHTML = renderTeacherDashboard();
      break;
    case 'student_join':
      app.innerHTML = firebaseNotice + renderStudentJoin();
      break;
    case 'game':
      app.innerHTML = renderGame();
      startTimer();
      break;
    case 'victory':
      app.innerHTML = renderVictory();
      triggerConfetti();
      break;
    default:
      app.innerHTML = renderHome();
  }
}

/* =========================================================
   5. TELAS
   ========================================================= */
function renderHome() {
  return `
    <div class="card-box">
      <div class="mascot">🎮</div>
      <h2>Jeu de Mémorisation</h2>
      <p style="color:var(--text-light)">Escolha como deseja entrar na partida:</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
        <button class="btn btn-purple btn-block" onclick="playSound('click'); startHostFlow();">🎓 Sou Professor (Criar Sala)</button>
        <button class="btn btn-blue btn-block" onclick="playSound('click'); setScreen('student_join');">✏️ Sou Aluno (Entrar com PIN)</button>
      </div>
    </div>
  `;
}

function renderHostCreate() {
  const pairsHtml = state.customPairs.map((p, idx) => `
    <div class="pair-card">
      <div class="pair-header">
        <span>Par #${idx + 1}</span>
        ${state.customPairs.length > 2 ? `<button class="btn btn-del" onclick="playSound('click'); removePair(${p.id});">Excluir</button>` : ''}
      </div>
      <div class="pair-grid">
        <div class="item-box">
          <select class="type-select" onchange="updateItemType(${p.id}, 'itemA', this.value)">
            <option value="text" ${p.itemA.type === 'text' ? 'selected' : ''}>Texto</option>
            <option value="image" ${p.itemA.type === 'image' ? 'selected' : ''}>Upload Imagem</option>
          </select>
          ${p.itemA.type === 'text' 
            ? `<input type="text" class="input-field input-sm" placeholder="Texto em francês..." value="${p.itemA.value}" oninput="updateItemValue(${p.id}, 'itemA', this.value)">`
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
            ? `<input type="text" class="input-field input-sm" placeholder="Tradução..." value="${p.itemB.value}" oninput="updateItemValue(${p.id}, 'itemB', this.value)">`
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
      
      <div style="display:flex; gap:10px; margin-bottom:14px;">
        <button class="btn btn-blue" style="font-size:12px; padding:8px; flex:1;" onclick="exportPairsJSON()">💾 Exportar (.JSON)</button>
        <button class="btn btn-purple" style="font-size:12px; padding:8px; flex:1;" onclick="document.getElementById('import-file').click()">📂 Importar</button>
        <input type="file" id="import-file" accept=".json" style="display:none;" onchange="importPairsJSON(this)">
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        ${pairsHtml}
      </div>

      <button class="btn btn-blue" style="font-size:14px; padding:10px; margin-top:12px;" onclick="playSound('click'); addPair();">
        + Adicionar Novo Par
      </button>
    </div>

    <div style="margin-top:16px;">
      <button class="btn btn-purple btn-block" onclick="playSound('click'); generateRoomAndPin();">Gerar PIN e Abrir Sala</button>
      <button class="btn btn-block" style="margin-top:8px; background:#ccc; box-shadow:0 4px 0 #aaa;" onclick="playSound('click'); setScreen('home');">Voltar</button>
    </div>
  `;
}

function renderHostLobby() {
  const playerList = state.players.map((p, idx) => `
    <li style="background:white; padding:8px 12px; border-radius:8px; margin-bottom:6px; font-weight:700; display:flex; justify-content:space-between;">
      <span>👤 ${p.name}</span>
      <span style="font-size:12px; color:var(--text-light);">${idx + 1}º da Fila</span>
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
        ${playerList.length > 0 ? playerList : '<li style="color:#aaa;">Aguardando alunos entrarem...</li>'}
      </ul>
    </div>

    <div style="margin-top:16px;">
      <button class="btn btn-green btn-block" onclick="playSound('click'); startMultiplayerGame();">🚀 Iniciar Jogo Agora</button>
    </div>
  `;
}

function renderTeacherDashboard() {
  const playersTable = state.players.map(p => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding:10px; font-weight:700;">👤 ${p.name}</td>
      <td style="padding:10px; text-align:center; font-weight:800; color:var(--purple);">${p.score || 0} pts</td>
      <td style="padding:10px; text-align:center;">
        ${p.name === state.activePlayerId ? '🟢 Jogando' : '⏳ Aguardando'}
      </td>
    </tr>
  `).join('');

  return `
    <div class="card-box" style="max-width:650px;">
      <h2>📊 Painel do Professor (Ao Vivo)</h2>
      <p style="color:var(--text-light); margin-bottom:14px;">PIN da Sala: <strong>${state.pin}</strong></p>

      <table style="width:100%; border-collapse:collapse; margin-top:10px; text-align:left;">
        <thead>
          <tr style="background:var(--bg); color:var(--text-light); font-size:13px;">
            <th style="padding:8px;">Aluno</th>
            <th style="padding:8px; text-align:center;">Pontuação</th>
            <th style="padding:8px; text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${playersTable.length > 0 ? playersTable : '<tr><td colspan="3" style="padding:10px; text-align:center;">Sem jogadores salvos</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top:20px;">
        <button class="btn btn-purple btn-block" onclick="generatePDFReport()">📄 Gerar Relatório em PDF</button>
      </div>
    </div>
  `;
}

function renderStudentJoin() {
  const characters = [
    'AGNÈS', 'BÉATRICE', 'CHARLOTTE', 'CÉCILE', 
    'JACQUES', 'JULIEN', 'MARGOT', 'MARIE', 
    'MATHIEU', 'MONIQUE', 'PHILLIPE', 'PIERRE'
  ];

  const charOptions = characters.map(char => `
    <option value="${char}" ${state.selectedChar === char ? 'selected' : ''}>${char}</option>
  `).join('');

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
              ${charOptions}
            </select>
          </div>

          <div style="width:100%; text-align:left;">
            <label style="font-weight:700; font-size:13px; color:var(--text-light);">Escolha a Variação (Skin):</label>
            <select id="select-skin" class="input-field" style="margin-top:4px;" onchange="updateAvatarDOM()">
              <option value="padrao" ${state.selectedSkin === 'padrao' ? 'selected' : ''}>Visual Padrão</option>
              <option value="01" ${state.selectedSkin === '01' ? 'selected' : ''}>Roupa 01</option>
            </select>
          </div>

          <div class="avatar-preview-container">
            <img id="avatar-img-preview" src="${state.avatarUrl}" alt="Preview Personagem" onerror="this.src='https://via.placeholder.com/90?text=Avatar'">
          </div>
        </div>

        <button class="btn btn-blue btn-block" onclick="playSound('click'); joinRoom();">Entrar no Jogo</button>
      </div>
    </div>

    <div style="margin-top:16px;">
      <button class="btn btn-block" style="background:#ccc; box-shadow:0 4px 0 #aaa;" onclick="playSound('click'); setScreen('home');">Voltar</button>
    </div>
  `;
}

function updateAvatarDOM() {
  const char = document.getElementById('select-char').value;
  const skin = document.getElementById('select-skin').value;

  state.selectedChar = char;
  state.selectedSkin = skin;

  let fileName = char;
  if (skin !== 'padrao') {
    fileName += skin;
  }

  state.avatarUrl = `assets/${encodeURIComponent(fileName)}.png`;

  localStorage.setItem('jeu_char', char);
  localStorage.setItem('jeu_skin', skin);

  const imgEl = document.getElementById('avatar-img-preview');
  if (imgEl) imgEl.src = state.avatarUrl;
}

function renderGame() {
  const isMyTurn = state.userName === state.activePlayerId || !isFirebaseActive;

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
        <span style="font-weight:700; color:var(--purple);" id="turn-indicator">
          ${isMyTurn ? "👉 SEU TURNO!" : `Aguardando: ${state.activePlayerId || '...'}`}
        </span>
      </div>

      <div class="timer-container">
        <div class="timer-bar" id="timer-bar"></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-weight:700; color:var(--red);" id="timer-text">⏱️ 20s</span>
        <span style="font-weight:700; color:var(--green);" id="score-display">Pontos: ${state.score}</span>
      </div>

      <div class="cards-grid">
        ${cardsGrid}
      </div>
    </div>
  `;
}

function renderVictory() {
  return `
    <div class="card-box">
      <div class="mascot">${state.matchedPairsCount === state.customPairs.length ? '🏆' : '⏳'}</div>
      <h2>${state.matchedPairsCount === state.customPairs.length ? 'Félicitations!' : 'Fim da Rodada!'}</h2>

      <div class="winner-podium">
        <div class="winner-avatar-frame">
          <img src="${state.avatarUrl}" alt="Avatar Campeão" onerror="this.src='https://via.placeholder.com/110?text=Winner'">
        </div>
        <h3 style="color:var(--purple); font-size:22px; font-weight:800;">${state.userName}</h3>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-number">${state.score}</div>
          <div class="stat-label">Pontuação Total</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${state.attempts}</div>
          <div class="stat-label">Tentativas</div>
        </div>
      </div>

      <button class="btn btn-green btn-block" onclick="playSound('click'); restartGame();">🔄 Jogar Novamente</button>
      <button class="btn btn-block" style="margin-top:8px; background:#ccc; box-shadow:0 4px 0 #aaa;" onclick="playSound('click'); setScreen('home');">Início</button>
    </div>
  `;
}

/* =========================================================
   6. TIMER E TROCA DE TURNO (20 SEGUNDOS)
   ========================================================= */
function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = 20;
  state.timeAudioPlayed = false;

  state.timerInterval = setInterval(() => {
    state.timeLeft -= 1;
    
    const timerText = document.getElementById('timer-text');
    const timerBar = document.getElementById('timer-bar');

    if (timerText) timerText.innerText = `⏱️ ${state.timeLeft}s`;
    if (timerBar) {
      const percentage = (state.timeLeft / 20) * 100;
      timerBar.style.width = `${percentage}%`;
    }

    if (state.timeLeft === 5 && !state.timeAudioPlayed) {
      playSound('time');
      state.timeAudioPlayed = true;
    }

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      playSound('alert');

      if (isFirebaseActive && (state.isHost || state.userName === state.activePlayerId)) {
        passTurnToNextPlayer();
      } else if (!isFirebaseActive) {
        setScreen('victory');
      }
    }
  }, 1000);
}

function passTurnToNextPlayer() {
  if (!isFirebaseActive || !state.pin || state.players.length === 0) return;

  const totalPlayers = state.players.length;
  const nextIndex = (state.currentTurnIndex + 1) % totalPlayers;
  const nextPlayer = state.players[nextIndex];

  db.ref(`rooms/${state.pin}`).update({
    currentTurnIndex: nextIndex,
    activePlayerId: nextPlayer.name
  });
}

/* =========================================================
   7. MULTIPLAYER E SINCRONIZAÇÃO
   ========================================================= */
function startHostFlow() {
  state.isHost = true;
  setScreen('host_create');
}

function generateRoomAndPin() {
  const invalid = state.customPairs.some(p => !p.itemA.value.trim() || !p.itemB.value.trim());
  if (invalid) {
    alert("Por favor, preencha todos os textos ou envie as imagens de todos os pares!");
    return;
  }

  state.pin = Math.floor(100000 + Math.random() * 900000).toString();
  setupCards();

  if (isFirebaseActive) {
    db.ref('rooms/' + state.pin).set({
      status: 'waiting',
      cards: state.cards,
      currentTurnIndex: 0,
      activePlayerId: '',
      players: {}
    });

    listenRoomUpdates();
  }

  setScreen('host_lobby');
}

function listenRoomUpdates() {
  if (!isFirebaseActive || !state.pin) return;

  db.ref(`rooms/${state.pin}`).on('value', (snapshot) => {
    const room = snapshot.val();
    if (!room) return;

    state.cards = room.cards || [];
    state.currentTurnIndex = room.currentTurnIndex || 0;
    state.activePlayerId = room.activePlayerId || '';

    if (room.players) {
      const playersArray = Object.values(room.players);
      state.players = playersArray.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    }

    if (room.status === 'playing') {
      if (state.isHost && state.currentScreen !== 'teacher_dashboard') {
        setScreen('teacher_dashboard');
      } else if (!state.isHost && state.currentScreen !== 'game') {
        setScreen('game');
      } else if (!state.isHost) {
        updateTurnHUD();
      }
    } else if (state.currentScreen === 'host_lobby') {
      render();
    }
  });
}

function startMultiplayerGame() {
  if (isFirebaseActive && state.players.length > 0) {
    const firstPlayer = state.players[0];
    db.ref('rooms/' + state.pin).update({
      status: 'playing',
      currentTurnIndex: 0,
      activePlayerId: firstPlayer.name
    });
  } else if (!isFirebaseActive) {
    setScreen('game');
  }
}

function joinRoom() {
  const nameInput = document.getElementById('student-name');
  const pinInput = document.getElementById('student-pin');

  const name = nameInput ? nameInput.value.trim() : '';
  const pin = pinInput ? pinInput.value.trim() : '';

  if (!name || (!pin && isFirebaseActive)) {
    alert("Preencha seu Nickname e o PIN!");
    return;
  }

  localStorage.setItem('jeu_nickname', name);

  state.userName = name;
  state.pin = pin;
  state.isHost = false;
  state.score = 0;
  state.attempts = 0;
  state.matchedPairsCount = 0;

  if (isFirebaseActive) {
    const playerRef = db.ref(`rooms/${pin}/players/${name}`);
    playerRef.set({
      name: name,
      avatar: state.avatarUrl,
      score: 0,
      joinedAt: Date.now()
    });

    listenRoomUpdates();
  } else {
    setupCards();
    setScreen('game');
  }
}

function updateTurnHUD() {
  const isMyTurn = state.userName === state.activePlayerId;
  const turnIndicator = document.getElementById('turn-indicator');
  
  if (turnIndicator) {
    turnIndicator.innerText = isMyTurn ? "👉 SEU TURNO!" : `Aguardando: ${state.activePlayerId}`;
  }

  state.isLockBoard = !isMyTurn;
}

/* =========================================================
   8. LÓGICA DO JOGO DA MEMÓRIA
   ========================================================= */
function setupCards() {
  let cards = [];
  state.customPairs.forEach(p => {
    cards.push({ pairId: p.id, type: p.itemA.type, val: p.itemA.value });
    cards.push({ pairId: p.id, type: p.itemB.type, val: p.itemB.value });
  });
  state.cards = cards.sort(() => Math.random() - 0.5);
}

function flipCard(index) {
  if (state.isLockBoard) return;
  
  const cardElement = document.getElementById(`card-${index}`);
  if (!cardElement || cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) return;

  playSound('click');
  cardElement.classList.add('flipped');

  const currentCard = state.cards[index];
  if (currentCard.type === 'text') {
    speakFrench(currentCard.val);
  }

  state.flippedCards.push({ index, pairId: currentCard.pairId });

  if (state.flippedCards.length === 2) {
    state.attempts += 1;
    checkMatch();
  }
}

function checkMatch() {
  state.isLockBoard = true;
  const [card1, card2] = state.flippedCards;

  if (card1.pairId === card2.pairId) {
    playSound('ok');
    document.getElementById(`card-${card1.index}`).classList.add('matched');
    document.getElementById(`card-${card2.index}`).classList.add('matched');
    
    state.score += 10;
    state.matchedPairsCount += 1;

    if (isFirebaseActive) {
      db.ref(`rooms/${state.pin}/players/${state.userName}`).update({ score: state.score });
    }

    const scoreEl = document.getElementById('score-display');
    if (scoreEl) scoreEl.innerText = `Pontos: ${state.score}`;

    resetTurn();

    if (state.matchedPairsCount === state.customPairs.length) {
      clearInterval(state.timerInterval);
      setTimeout(() => setScreen('victory'), 600);
    } else {
      startTimer();
    }
  } else {
    setTimeout(() => {
      playSound('falha');
      document.getElementById(`card-${card1.index}`).classList.remove('flipped');
      document.getElementById(`card-${card2.index}`).classList.remove('flipped');
      resetTurn();

      if (isFirebaseActive) {
        passTurnToNextPlayer();
      }
    }, 1000);
  }
}

function resetTurn() {
  state.flippedCards = [];
  state.isLockBoard = false;
}

function restartGame() {
  state.score = 0;
  state.attempts = 0;
  state.matchedPairsCount = 0;
  setupCards();
  setScreen('game');
}

/* =========================================================
   9. GESTÃO DE PARES E EXPORTAÇÃO
   ========================================================= */
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
  if (pair) pair[itemKey].value = value;
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

function exportPairsJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.customPairs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `jogo_memoria_pares.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importPairsJSON(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedPairs = JSON.parse(e.target.result);
      if (Array.isArray(importedPairs)) {
        state.customPairs = importedPairs;
        render();
        alert("Jogo importado com sucesso!");
      }
    } catch (err) {
      alert("Arquivo JSON inválido.");
    }
  };
  reader.readAsText(file);
}

function generatePDFReport() {
  const printWindow = window.open('', '_blank');
  
  const rows = state.players.map((p, i) => `
    <tr>
      <td style="padding:8px; border:1px solid #ccc;">${i + 1}º</td>
      <td style="padding:8px; border:1px solid #ccc;">${p.name}</td>
      <td style="padding:8px; border:1px solid #ccc; text-align:center;">${p.score || 0}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <html>
      <head>
        <title>Relatório de Desempenho - Jeu de Mémorisation</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #6A4C93; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #6A4C93; color: white; padding: 10px; border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <h1>📊 Relatório da Aula - Francês</h1>
        <p><strong>PIN da Sala:</strong> ${state.pin}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        
        <table>
          <thead>
            <tr>
              <th>Posição</th>
              <th>Aluno</th>
              <th>Pontuação Final</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }
}

/* =========================================================
   10. INICIALIZAÇÃO
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  render();
});
