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
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    const frenchVoice = cachedVoices.find(voice => voice.lang.includes('fr'));
    if (frenchVoice) utterance.voice = frenchVoice;
    window.speechSynthesis.speak(utterance);
  }
}

/* =========================================================
   2. CONFIGURAÇÃO DO FIREBASE
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
  timeLeft: 20,
  timerInterval: null,
  timeAudioPlayed: false,
  matchedPairsCount: 0,
  isHost: false,
  players: [],
  currentTurnIndex: 0,
  activePlayerId: null,
  turnStartTime: 0,
  customPairs: [
    { id: 1, itemA: { type: 'text', value: 'Bonjour' }, itemB: { type: 'text', value: 'Olá' } },
    { id: 2, itemA: { type: 'text', value: 'Merci' }, itemB: { type: 'text', value: 'Obrigado' } }
  ],
  cards: [],
  flippedCards: [],
  isLockBoard: false
};

/* =========================================================
   4. RENDERIZAÇÃO E NAVEGAÇÃO
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
      ⚠️ Modo Offline (sem Firebase).
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
    case 'student_join':
      app.innerHTML = firebaseNotice + renderStudentJoin();
      break;
    case 'student_lobby':
      app.innerHTML = firebaseNotice + renderStudentLobby();
      break;
    case 'teacher_dashboard':
      app.innerHTML = renderGame(true); // Exibe visão completa com grid e ranking no professor
      break;
    case 'game':
      app.innerHTML = renderGame(false);
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
   5. TELAS PRINCIPAIS
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
      <div style="display:flex; flex-direction:column; gap:12px;">${pairsHtml}</div>
      <button class="btn btn-blue" style="font-size:14px; padding:10px; margin-top:12px;" onclick="playSound('click'); addPair();">+ Adicionar Novo Par</button>
    </div>
    <div style="margin-top:16px;">
      <button class="btn btn-purple btn-block" onclick="playSound('click'); generateRoomAndPin();">Gerar PIN e Abrir Sala</button>
      <button class="btn btn-block" style="margin-top:8px; background:#ccc; box-shadow:0 4px 0 #aaa;" onclick="playSound('click'); setScreen('home');">Voltar</button>
    </div>
  `;
}

function renderHostLobby() {
  const playerList = state.players.map((p, idx) => `
    <li style="background:white; padding:8px 12px; border-radius:8px; margin-bottom:6px; font-weight:700; display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${p.avatar || 'https://via.placeholder.com/35'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
        <span>${p.name}</span>
      </div>
      <span style="font-size:12px; color:var(--text-light);">${idx + 1}º a jogar</span>
    </li>
  `).join('');

  return `
    <div class="card-box">
      <h2>Sala Criada!</h2>
      <p style="color:var(--text-light)">Passe o PIN para os alunos:</p>
      <div style="font-size:36px; font-family:'Baloo 2'; font-weight:800; color:var(--purple); background:var(--bg); padding:10px; border-radius:12px; margin:12px 0;">${state.pin}</div>
      <h3>Alunos Conectados (${state.players.length}):</h3>
      <ul style="list-style:none; padding:0; text-align:left; max-height:200px; overflow-y:auto;">
        ${playerList.length > 0 ? playerList : '<li style="color:#aaa; text-align:center;">Aguardando alunos entrarem...</li>'}
      </ul>
    </div>
    <div style="margin-top:16px;">
      <button class="btn btn-green btn-block" onclick="playSound('click'); startMultiplayerGame();">🚀 Iniciar Jogo Agora</button>
    </div>
  `;
}

function renderStudentJoin() {
  const characters = ['AGNÈS', 'BÉATRICE', 'CHARLOTTE', 'CÉCILE', 'JACQUES', 'JULIEN', 'MARGOT', 'MARIE', 'MATHIEU', 'MONIQUE', 'PHILLIPE', 'PIERRE'];
  const charOptions = characters.map(char => `<option value="${char}" ${state.selectedChar === char ? 'selected' : ''}>${char}</option>`).join('');

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
            <select id="select-char" class="input-field" style="margin-top:4px;" onchange="updateAvatarDOM()">${charOptions}</select>
          </div>
          <div style="width:100%; text-align:left;">
            <label style="font-weight:700; font-size:13px; color:var(--text-light);">Escolha a Variação (Skin):</label>
            <select id="select-skin" class="input-field" style="margin-top:4px;" onchange="updateAvatarDOM()">
              <option value="padrao" ${state.selectedSkin === 'padrao' ? 'selected' : ''}>Visual Padrão</option>
              <option value="01" ${state.selectedSkin === '01' ? 'selected' : ''}>Roupa 01</option>
            </select>
          </div>
          <div class="avatar-preview-container">
            <img id="avatar-img-preview" src="${state.avatarUrl}" alt="Preview" onerror="this.src='https://via.placeholder.com/90?text=Avatar'">
          </div>
        </div>
        <button class="btn btn-blue btn-block" onclick="playSound('click'); joinRoom();">Entrar na Sala</button>
      </div>
    </div>
    <div style="margin-top:16px;">
      <button class="btn btn-block" style="background:#ccc; box-shadow:0 4px 0 #aaa;" onclick="playSound('click'); setScreen('home');">Voltar</button>
    </div>
  `;
}

function renderStudentLobby() {
  const playerList = state.players.map((p, idx) => `
    <li style="background:white; padding:10px; border-radius:10px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${p.avatar || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid var(--purple);">
        <span style="font-weight:700;">${p.name} ${p.name === state.userName ? '(Você)' : ''}</span>
      </div>
      <span style="font-size:12px; font-weight:700; background:var(--bg); padding:4px 8px; border-radius:6px; color:var(--purple);">${idx + 1}º a jogar</span>
    </li>
  `).join('');

  return `
    <div class="card-box">
      <h2>Sala de Espera</h2>
      <p style="color:var(--text-light)">PIN da Sala: <strong>${state.pin}</strong></p>
      <div style="margin:16px 0; background:#FFF3CD; padding:10px; border-radius:8px; font-weight:700; color:#856404; animation: pulse 1.5s infinite;">
        ⏳ Aguardando o professor iniciar o jogo...
      </div>
      <h3 style="text-align:left; font-size:14px; color:var(--text-light); margin-bottom:10px;">Ordem dos Participantes:</h3>
      <ul style="list-style:none; padding:0; text-align:left; max-height:220px; overflow-y:auto;">
        ${playerList.length > 0 ? playerList : '<li>Aguardando outros jogadores...</li>'}
      </ul>
    </div>
  `;
}

/* =========================================================
   6. TELA DO JOGO (UTILIZADA TANTO PARA ALUNO QUANTO PROFESSOR)
   ========================================================= */
function renderGame(isTeacher = false) {
  const isMyTurn = state.userName === state.activePlayerId && !isTeacher;

  // Ordena corretamente os 5 melhores jogadores (Ranking Superior)
  const topPlayers = [...state.players]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  const leaderboardCards = topPlayers.map((p, idx) => `
    <div style="display:flex; flex-direction:column; align-items:center; background:white; padding:6px 8px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1); min-width:65px;">
      <img src="${p.avatar || 'https://via.placeholder.com/35'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border:2px solid ${idx === 0 ? '#FFD700' : 'var(--purple)'};">
      <span style="font-size:11px; font-weight:800; max-width:60px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">${p.name}</span>
      <span style="font-size:10px; font-weight:700; color:var(--purple);">${p.score || 0} ${p.score === 1 ? 'par' : 'pares'}</span>
    </div>
  `).join('');

  // Renderiza as cartas refletindo o estado global (flipped e matched)
  const cardsGrid = state.cards.map((c, index) => {
    const isFlipped = c.isFlipped || c.isMatched;
    const isMatchedClass = c.isMatched ? 'matched' : '';
    const isFlippedClass = isFlipped ? 'flipped' : '';

    return `
      <div class="memory-card ${isFlippedClass} ${isMatchedClass}" id="card-${index}" onclick="${!isTeacher ? `flipCard(${index})` : ''}">
        <div class="card-inner">
          <div class="card-back">❓</div>
          <div class="card-front">
            ${c.type === 'image' ? `<img src="${c.val}" alt="imagem">` : `<span>${c.val}</span>`}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!-- Top 5 Ranking Superior -->
    <div style="width:100%; max-width:600px; margin-bottom:12px; overflow-x:auto;">
      <div style="display:flex; justify-content:center; gap:8px;">
        ${leaderboardCards}
      </div>
    </div>

    <div class="card-box" style="max-width:600px;">
      <div class="player-hud">
        <div class="player-info">
          <img src="${isTeacher ? 'assets/MARIE.png' : state.avatarUrl}" class="hud-avatar" alt="Avatar">
          <span class="hud-nickname">${isTeacher ? 'Professor' : state.userName}</span>
        </div>
        <span style="font-weight:700; color:var(--purple);" id="turn-indicator">
          ${isTeacher ? `Vez de: ${state.activePlayerId || '...'}` : (isMyTurn ? "👉 SEU TURNO!" : `Vez de: ${state.activePlayerId || '...'}`)}
        </span>
      </div>

      <div class="timer-container">
        <div class="timer-bar" id="timer-bar" style="width:${(state.timeLeft / 20) * 100}%"></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-weight:700; color:var(--red);" id="timer-text">⏱️ ${state.timeLeft}s</span>
        ${!isTeacher ? `<span style="font-weight:700; color:var(--green);" id="score-display">Seus Pares: ${state.score}</span>` : `<button class="btn btn-purple" style="padding:4px 10px; font-size:12px;" onclick="generatePDFReport()">📄 PDF</button>`}
      </div>

      <div class="cards-grid">
        ${cardsGrid}
      </div>
    </div>
  `;
}

function renderVictory() {
  const sortedPlayers = [...state.players].sort((a, b) => (b.score || 0) - (a.score || 0));

  const p1 = sortedPlayers[0] || { name: '-', score: 0, avatar: '' };
  const p2 = sortedPlayers[1] || { name: '-', score: 0, avatar: '' };
  const p3 = sortedPlayers[2] || { name: '-', score: 0, avatar: '' };

  const remainingPlayers = sortedPlayers.slice(3);

  const remainingRows = remainingPlayers.map((p, idx) => `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:8px; font-weight:700;">${idx + 4}º</td>
      <td style="padding:8px; display:flex; align-items:center; gap:8px;">
        <img src="${p.avatar}" style="width:25px; height:25px; border-radius:50%;">
        <span>${p.name}</span>
      </td>
      <td style="padding:8px; text-align:center; font-weight:800; color:var(--purple);">${p.score || 0} pares</td>
    </tr>
  `).join('');

  return `
    <div class="card-box" style="max-width:600px;">
      <h2>🏆 Fim da Partida!</h2>
      <p style="color:var(--text-light); margin-bottom:20px;">Todos os pares foram encontrados!</p>

      <div style="display:flex; justify-content:center; align-items:flex-end; gap:10px; margin-bottom:30px; height:180px;">
        <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
          <img src="${p2.avatar || 'https://via.placeholder.com/45'}" style="width:45px; height:45px; border-radius:50%; border:3px solid #C0C0C0; margin-bottom:4px;">
          <span style="font-size:12px; font-weight:800; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p2.name}</span>
          <span style="font-size:10px; font-weight:700; color:var(--purple);">${p2.score || 0} pares</span>
          <div style="width:100%; height:80px; background:#C0C0C0; color:white; font-weight:800; display:flex; align-items:center; justify-content:center; border-radius:8px 8px 0 0; font-size:20px;">2</div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
          <img src="${p1.avatar || 'https://via.placeholder.com/60'}" style="width:60px; height:60px; border-radius:50%; border:3px solid #FFD700; margin-bottom:4px;">
          <span style="font-size:13px; font-weight:800; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p1.name}</span>
          <span style="font-size:11px; font-weight:700; color:var(--purple);">${p1.score || 0} pares</span>
          <div style="width:100%; height:110px; background:#FFD700; color:white; font-weight:800; display:flex; align-items:center; justify-content:center; border-radius:8px 8px 0 0; font-size:26px;">1</div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
          <img src="${p3.avatar || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; border-radius:50%; border:3px solid #CD7F32; margin-bottom:4px;">
          <span style="font-size:12px; font-weight:800; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p3.name}</span>
          <span style="font-size:10px; font-weight:700; color:var(--purple);">${p3.score || 0} pares</span>
          <div style="width:100%; height:60px; background:#CD7F32; color:white; font-weight:800; display:flex; align-items:center; justify-content:center; border-radius:8px 8px 0 0; font-size:18px;">3</div>
        </div>
      </div>

      ${remainingPlayers.length > 0 ? `
        <h3 style="text-align:left; font-size:14px; color:var(--text-light); margin-bottom:8px;">Demais Colocados:</h3>
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
          <tbody>${remainingRows}</tbody>
        </table>
      ` : ''}

      <div style="margin-top:24px;">
        <button class="btn btn-green btn-block" onclick="playSound('click'); setScreen('home');">Início</button>
      </div>
    </div>
  `;
}

function updateAvatarDOM() {
  const char = document.getElementById('select-char').value;
  const skin = document.getElementById('select-skin').value;

  state.selectedChar = char;
  state.selectedSkin = skin;

  let fileName = char;
  if (skin !== 'padrao') fileName += skin;

  state.avatarUrl = `assets/${encodeURIComponent(fileName)}.png`;

  localStorage.setItem('jeu_char', char);
  localStorage.setItem('jeu_skin', skin);

  const imgEl = document.getElementById('avatar-img-preview');
  if (imgEl) imgEl.src = state.avatarUrl;
}

/* =========================================================
   7. CRONÔMETRO SINCRONIZADO POR JOGADA
   ========================================================= */
function syncTimer(turnStartTime) {
  clearInterval(state.timerInterval);
  if (!turnStartTime) return;

  state.timeAudioPlayed = false;

  state.timerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - turnStartTime) / 1000);
    state.timeLeft = Math.max(0, 20 - elapsedSeconds);

    const timerText = document.getElementById('timer-text');
    const timerBar = document.getElementById('timer-bar');

    if (timerText) timerText.innerText = `⏱️ ${state.timeLeft}s`;
    if (timerBar) timerBar.style.width = `${(state.timeLeft / 20) * 100}%`;

    if (state.timeLeft === 5 && !state.timeAudioPlayed) {
      playSound('time');
      state.timeAudioPlayed = true;
    }

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      playSound('alert');

      // O Host gerencia a passagem do turno por estouro do tempo
      if (isFirebaseActive && state.isHost) {
        passTurnToNextPlayer();
      }
    }
  }, 500);
}

function passTurnToNextPlayer() {
  if (!isFirebaseActive || !state.pin || state.players.length === 0) return;

  const totalPlayers = state.players.length;
  const nextIndex = (state.currentTurnIndex + 1) % totalPlayers;
  const nextPlayer = state.players[nextIndex];

  // Desvira cartas não pareadas ao passar de turno
  const updatedCards = state.cards.map(c => c.isMatched ? c : { ...c, isFlipped: false });

  db.ref(`rooms/${state.pin}`).update({
    currentTurnIndex: nextIndex,
    activePlayerId: nextPlayer.name,
    turnStartTime: Date.now(),
    cards: updatedCards
  });
}

/* =========================================================
   8. MULTIPLAYER E SINCRONIZAÇÃO EM TEMPO REAL
   ========================================================= */
function startHostFlow() {
  state.isHost = true;
  setScreen('host_create');
}

function generateRoomAndPin() {
  const invalid = state.customPairs.some(p => !p.itemA.value.trim() || !p.itemB.value.trim());
  if (invalid) {
    alert("Por favor, preencha todos os campos dos pares!");
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
      matchedPairsCount: 0,
      totalPairs: state.customPairs.length,
      turnStartTime: 0,
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
    state.matchedPairsCount = room.matchedPairsCount || 0;

    if (room.turnStartTime !== state.turnStartTime) {
      state.turnStartTime = room.turnStartTime || 0;
      syncTimer(state.turnStartTime);
    }

    if (room.players) {
      const playersArray = Object.values(room.players);
      state.players = playersArray.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      
      const me = state.players.find(p => p.name === state.userName);
      if (me) state.score = me.score || 0;
    }

    if (room.status === 'playing') {
      if (state.isHost && state.currentScreen !== 'teacher_dashboard') {
        setScreen('teacher_dashboard');
      } else if (!state.isHost && state.currentScreen !== 'game') {
        setScreen('game');
      } else {
        render(); // Re-renderiza para atualizar as cartas viradas e o ranking
      }
    } else if (room.status === 'waiting') {
      if (state.currentScreen === 'host_lobby' || state.currentScreen === 'student_lobby') {
        render();
      }
    } else if (room.status === 'finished') {
      clearInterval(state.timerInterval);
      setScreen('victory');
    }
  });
}

function startMultiplayerGame() {
  if (isFirebaseActive && state.players.length > 0) {
    const firstPlayer = state.players[0];
    db.ref('rooms/' + state.pin).update({
      status: 'playing',
      currentTurnIndex: 0,
      activePlayerId: firstPlayer.name,
      turnStartTime: Date.now()
    });
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

  if (isFirebaseActive) {
    db.ref(`rooms/${pin}/players/${name}`).set({
      name: name,
      avatar: state.avatarUrl,
      score: 0,
      joinedAt: Date.now()
    });

    listenRoomUpdates();
    setScreen('student_lobby');
  } else {
    setupCards();
    setScreen('game');
  }
}

/* =========================================================
   9. LÓGICA SINCRONIZADA DO JOGO DA MEMÓRIA
   ========================================================= */
function setupCards() {
  let cards = [];
  state.customPairs.forEach(p => {
    cards.push({ pairId: p.id, type: p.itemA.type, val: p.itemA.value, isFlipped: false, isMatched: false });
    cards.push({ pairId: p.id, type: p.itemB.type, val: p.itemB.value, isFlipped: false, isMatched: false });
  });
  state.cards = cards.sort(() => Math.random() - 0.5);
}

function flipCard(index) {
  if (state.isLockBoard) return;
  if (state.userName !== state.activePlayerId && isFirebaseActive) return; // Apenas o jogador do turno clica

  const card = state.cards[index];
  if (card.isFlipped || card.isMatched) return;

  playSound('click');

  if (card.type === 'text') {
    speakFrench(card.val);
  }

  // Atualiza no estado local e envia para o Firebase
  state.cards[index].isFlipped = true;

  if (isFirebaseActive) {
    db.ref(`rooms/${state.pin}/cards`).set(state.cards);
  }

  const currentlyFlipped = state.cards.filter((c, i) => c.isFlipped && !c.isMatched);

  if (currentlyFlipped.length === 2) {
    checkMatch(currentlyFlipped);
  }
}

function checkMatch(flippedTwo) {
  state.isLockBoard = true;
  const [card1, card2] = flippedTwo;

  if (card1.pairId === card2.pairId) {
    playSound('ok');
    
    // Marca como matched no array
    state.cards.forEach(c => {
      if (c.pairId === card1.pairId) c.isMatched = true;
    });

    state.score += 1;
    state.matchedPairsCount += 1;

    if (isFirebaseActive) {
      db.ref(`rooms/${state.pin}/players/${state.userName}`).update({ score: state.score });
      db.ref(`rooms/${state.pin}`).update({
        cards: state.cards,
        matchedPairsCount: state.matchedPairsCount,
        turnStartTime: Date.now() // Reinicia o relógio em 20s para a nova jogada do mesmo jogador
      });
    }

    state.isLockBoard = false;

    if (state.matchedPairsCount === state.customPairs.length) {
      clearInterval(state.timerInterval);
      if (isFirebaseActive) {
        db.ref(`rooms/${state.pin}`).update({ status: 'finished' });
      }
    }
  } else {
    setTimeout(() => {
      playSound('falha');
      
      // Desvira as duas cartas ativas
      state.cards.forEach(c => {
        if (!c.isMatched) c.isFlipped = false;
      });

      state.isLockBoard = false;

      if (isFirebaseActive) {
        passTurnToNextPlayer(); // Passa o turno e o próximo tempo inicia em 20s
      }
    }, 1200);
  }
}

/* =========================================================
   10. GESTÃO DE PARES E EXPORTAÇÃO DE RELATÓRIO
   ========================================================= */
function addPair() {
  state.customPairs.push({ id: Date.now(), itemA: { type: 'text', value: '' }, itemB: { type: 'text', value: '' } });
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
  const sortedPlayers = [...state.players].sort((a, b) => (b.score || 0) - (a.score || 0));
  
  const rows = sortedPlayers.map((p, i) => `
    <tr>
      <td style="padding:8px; border:1px solid #ccc;">${i + 1}º</td>
      <td style="padding:8px; border:1px solid #ccc;">${p.name}</td>
      <td style="padding:8px; border:1px solid #ccc; text-align:center;">${p.score || 0} pares</td>
    </tr>
  `).join('');

  const htmlContent = `
    <html>
      <head>
        <title>Relatório - Jeu de Mémorisation</title>
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
              <th>Pares Encontrados</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
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
   11. INICIALIZAÇÃO
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  render();
});
