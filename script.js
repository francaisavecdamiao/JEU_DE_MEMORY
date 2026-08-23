// Estado global do jogador
const jogador = {
  nickname: "",
  personagem: "",
  skin: "",
  avatarUrl: ""
};

// Referências aos elementos do DOM
const inputNickname = document.getElementById('input-nickname');
const selectPersonagem = document.getElementById('select-personagem');
const selectSkin = document.getElementById('select-skin');
const avatarPreview = document.getElementById('avatar-preview');
const btnIniciar = document.getElementById('btn-iniciar');

const telaPerfil = document.getElementById('tela-perfil');
const telaJogo = document.getElementById('tela-jogo');
const hudNickname = document.getElementById('hud-nickname');
const hudAvatar = document.getElementById('hud-avatar');

// Monta e atualiza o caminho da imagem de pré-visualização
function atualizarAvatarPreview() {
  const nomePersonagem = selectPersonagem.value; // MARIE ou MATHIEU
  const variacaoSkin = selectSkin.value;         // padrao, 01 ou 02

  let caminhoImagem = "";

  if (variacaoSkin === "padrao") {
    caminhoImagem = `assets/${nomePersonagem}.png`;
  } else {
    caminhoImagem = `assets/${nomePersonagem}${variacaoSkin}.png`;
  }

  avatarPreview.src = caminhoImagem;
  return caminhoImagem;
}

// Escuta mudanças nos seletores de personagem e skin
selectPersonagem.addEventListener('change', atualizarAvatarPreview);
selectSkin.addEventListener('change', atualizarAvatarPreview);

// Inicia a partida e transiciona as telas
btnIniciar.addEventListener('click', () => {
  const nickDigitado = inputNickname.value.trim();

  if (nickDigitado === "") {
    alert("Por favor, digite um Nickname antes de continuar!");
    inputNickname.focus();
    return;
  }

  // Grava as escolhas no objeto do jogador
  jogador.nickname = nickDigitado;
  jogador.personagem = selectPersonagem.value;
  jogador.skin = selectSkin.value;
  jogador.avatarUrl = atualizarAvatarPreview();

  // Esconde a tela de cadastro e exibe o jogo
  telaPerfil.style.display = 'none';
  telaJogo.style.display = 'flex';

  // Atualiza as informações do HUD no jogo
  hudNickname.innerText = jogador.nickname;
  hudAvatar.src = jogador.avatarUrl;

  console.log("Perfil carregado:", jogador);
  iniciarTabuleiro();
});

// Função para iniciar a lógica do jogo de memória
function iniciarTabuleiro() {
  // Aqui entra a sua lógica de criar as cartas do jogo de memória
  console.log("Tabuleiro pronto para jogar!");
}
