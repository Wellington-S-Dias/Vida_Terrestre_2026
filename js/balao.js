// estrutura da caixa
document.body.insertAdjacentHTML(
  "beforeend",
  `
    <div class="caixa-overlay">
        <div class="caixa-box">

            <button class="caixa-close" type="button">
                &times;
            </button>

            <div class="caixa-icon">✓</div>

            <h2 class="caixa-title">
                Cadastro realizado!
            </h2>

            <p class="caixa-message">
                Sua conta foi criada com sucesso!
            </p>

            <button class="caixa-button" type="button">
                Continuar
            </button>

        </div>
    </div>
`,
);

// Elementos
const caixaOverlay = document.querySelector(".caixa-overlay");
const caixaTitle = document.querySelector(".caixa-title");
const caixaMessage = document.querySelector(".caixa-message");
const caixaIcon = document.querySelector(".caixa-icon");
const caixaClose = document.querySelector(".caixa-close");
const caixaButton = document.querySelector(".caixa-button");

// Função para abrir
function showMessage(titulo, mensagem, tipo = "success") {
  // Define o conteúdo
  caixaTitle.textContent = titulo;
  caixaMessage.textContent = mensagem;

  // Define o ícone conforme o tipo
  const icones = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ⓘ",
  };

  caixaIcon.textContent = icones[tipo] || icones.info;

  // Exibe o modal
  caixaOverlay.style.display = "flex";
}

// Função para fechar o modal
function closeMessage() {
  caixaOverlay.style.display = "none";
}

// Fecha pelo X
caixaClose.addEventListener("click", closeMessage);

// Fecha pelo botão principal
caixaButton.addEventListener("click", closeMessage);

// Fecha ao clicar fora da caixa
caixaOverlay.addEventListener("click", function (event) {
  if (event.target === caixaOverlay) {
    closeMessage();
  }
});
