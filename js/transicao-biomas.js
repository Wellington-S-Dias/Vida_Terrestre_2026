document.addEventListener("DOMContentLoaded", () => {
  const botoesBioma = document.querySelectorAll(".biome-btn");
  const imagemLogo = document.querySelector(".side-bar-logo img");

  let imagemAtiva = document.getElementById("image-bg-1");
  let proximaImagem = document.getElementById("image-bg-2");

  if (!botoesBioma.length) return;

  document.body.setAttribute("data-biome", "default");
  const botaoTodos = document.querySelector('.biome-btn[data-biome="todos"]');
  if (botaoTodos) {
    botaoTodos.classList.add("active");
    botaoTodos.setAttribute("aria-pressed", "true");
    const imagemInicial = botaoTodos.getAttribute("data-image");
    if (imagemInicial && imagemAtiva) {
      imagemAtiva.style.backgroundImage = `url("${imagemInicial}")`;
    }
  }

  botoesBioma.forEach((botao) => {
    botao.addEventListener("click", () => {
      const bioma = botao.getAttribute("data-biome");
      const novaFonteImagem = botao.getAttribute("data-image");
      const novaFonteLogo = botao.getAttribute("data-logo");
      // =========================
      // BOTÃO ATIVO
      // =========================

      botoesBioma.forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-pressed", "false");
      });

      botao.classList.add("active");
      botao.setAttribute("aria-pressed", "true");

      // =========================
      // BIOMA NO BODY
      // =========================

      document.body.setAttribute(
        "data-biome",
        bioma === "todos" ? "default" : bioma || "default",
      );

      // =========================
      // TROCAR LOGO
      // =========================

      if (novaFonteLogo && imagemLogo) {
        imagemLogo.style.transition = "opacity 0.15s ease";
        imagemLogo.style.opacity = "0";

        setTimeout(() => {
          imagemLogo.src = novaFonteLogo;
          imagemLogo.style.opacity = "1";
        }, 150);
      }

      // =========================
      // TROCAR IMAGEM DE FUNDO
      // =========================

      if (!novaFonteImagem || !imagemAtiva || !proximaImagem) return;

      proximaImagem.style.backgroundImage = `url("${novaFonteImagem}")`;
      proximaImagem.classList.add("active");
      imagemAtiva.classList.remove("active");

      const temporaria = imagemAtiva;
      imagemAtiva = proximaImagem;
      proximaImagem = temporaria;
    });
  });
});
