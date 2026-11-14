let animais = [];

let filtroRegiao = "";
let filtroBioma = "";
let filtroTipo = "";
let filtroStatus = "";
let textoPesquisa = "";
const CARDS_POR_LOTE = 20;
let limiteCardsVisiveis = CARDS_POR_LOTE;
let animaisFiltradosAtuais = [];

function normalizar(valor) {
  return (valor || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarBioma(valor) {
  return normalizar(valor).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function atualizarContadorFiltros() {
  const contador = document.getElementById("contador-filtros");
  if (!contador) return;

  const ativos = [
    filtroRegiao && filtroRegiao !== "todas",
    filtroTipo && filtroTipo !== "todos",
    filtroStatus && filtroStatus !== "todos",
    filtroBioma && normalizarBioma(filtroBioma) !== "todos",
  ].filter(Boolean).length;

  contador.textContent = ativos > 0 ? ativos : "";
}

async function carregarAnimais() {
  const cardsContainer = document.getElementById("cards-container");

  try {
    const response = await fetch("/animais_completos");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    animais = await response.json();
    aplicarFiltros();
  } catch (erro) {
    if (cardsContainer) {
      cardsContainer.setAttribute("aria-busy", "false");
      cardsContainer.innerHTML =
        '<p class="no-results">Não foi possível carregar as espécies agora. Tente novamente em instantes.</p>';
    }
    console.error("Erro ao carregar animais:", erro);
  }
}

function aplicarFiltros(reiniciarLimite = true) {
  if (reiniciarLimite) limiteCardsVisiveis = CARDS_POR_LOTE;
  animaisFiltradosAtuais = animais.filter((animal) => {
    const nome = normalizar(animal.nome);
    const nomeCientifico = normalizar(animal.nome_cientifico);
    const status = normalizar(animal.status_class);
    const regiao = normalizar(animal.regiao);
    const biomas = animal.bioma || animal.biomas || "";
    const tipo = normalizar(animal.tipo);

    const correspondePesquisa =
      !textoPesquisa ||
      nome.includes(normalizar(textoPesquisa)) ||
      nomeCientifico.includes(normalizar(textoPesquisa));

    const correspondeStatus =
      !filtroStatus ||
      filtroStatus === "todos" ||
      status === normalizar(filtroStatus);

    const correspondeRegiao =
      !filtroRegiao ||
      filtroRegiao === "todas" ||
      regiao.includes(normalizar(filtroRegiao));

    const correspondeBioma =
      !filtroBioma ||
      normalizarBioma(filtroBioma) === "todos" ||
      biomas
        .toString()
        .split(/[,;|]/)
        .map(normalizarBioma)
        .includes(normalizarBioma(filtroBioma));

    const correspondeTipo =
      !filtroTipo || filtroTipo === "todos" || tipo === normalizar(filtroTipo);

    return (
      correspondePesquisa &&
      correspondeStatus &&
      correspondeRegiao &&
      correspondeBioma &&
      correspondeTipo
    );
  });

  renderCards(animaisFiltradosAtuais.slice(0, limiteCardsVisiveis));

  const botaoVerMais = document.getElementById("btn-ver-mais");
  if (botaoVerMais) {
    const restantes = Math.max(
      0,
      animaisFiltradosAtuais.length - limiteCardsVisiveis,
    );
    botaoVerMais.hidden = restantes === 0;
    botaoVerMais.textContent =
      restantes > 0 ? `Ver mais (${restantes})` : "Ver mais";
  }
}

function configurarVerMais() {
  const botao = document.getElementById("btn-ver-mais");
  if (!botao) return;

  botao.addEventListener("click", () => {
    limiteCardsVisiveis += CARDS_POR_LOTE;
    aplicarFiltros(false);
  });
}

function configurarPesquisa() {
  const input = document.getElementById("search-input");
  if (!input) return;

  input.addEventListener("input", (event) => {
    textoPesquisa = event.target.value.trim();
    aplicarFiltros();
  });
}

function configurarBiomas() {
  const botoesContainer = document.querySelector(".biome-buttons");
  const destino = document.getElementById("biome-filter-slot");
  if (botoesContainer && destino) {
    const pontoOriginal = document.createComment(
      "Posição original dos filtros de bioma",
    );
    botoesContainer.parentNode.insertBefore(pontoOriginal, botoesContainer);

    const ajustarPosicao = (event) => {
      if (event.matches) {
        destino.appendChild(botoesContainer);
      } else {
        pontoOriginal.parentNode?.insertBefore(
          botoesContainer,
          pontoOriginal.nextSibling,
        );
      }
    };

    const telaPequena = window.matchMedia("(max-width: 600px)");
    ajustarPosicao(telaPequena);
    telaPequena.addEventListener("change", ajustarPosicao);
  }

  const botoes = document.querySelectorAll(".biome-btn");

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroBioma = botao.getAttribute("data-biome") || "";
      aplicarFiltros();
      atualizarContadorFiltros();
    });
  });
}

// Controle do painel de filtros
function configurarDrawerFiltros() {
  const btnFiltros = document.getElementById("btn-filtros");
  const btnFechar = document.getElementById("btn-fechar");
  const btnAplicar = document.getElementById("btn-aplicar");
  const btnLimpar = document.getElementById("btn-limpar");
  const drawer = document.getElementById("filter-drawer");
  const contadorBadges = document.getElementById("contador-filtros");

  if (!btnFiltros || !drawer) return;

  const abrir = () => {
    if (drawer.open) return;
    drawer.showModal();
    btnFiltros.setAttribute("aria-expanded", "true");
    document.body.classList.add("filter-drawer-open");
    window.requestAnimationFrame(() =>
      btnFechar?.focus({ preventScroll: true }),
    );
  };
  const fechar = () => {
    if (drawer.open) drawer.close();
  };

  btnFiltros.addEventListener("click", abrir);
  if (btnFechar) btnFechar.addEventListener("click", fechar);
  drawer.addEventListener("click", (event) => {
    const bounds = drawer.getBoundingClientRect();
    const foraDoPainel =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (foraDoPainel) fechar();
  });
  drawer.addEventListener("close", () => {
    btnFiltros.setAttribute("aria-expanded", "false");
    document.body.classList.remove("filter-drawer-open");
    btnFiltros.focus({ preventScroll: true });
  });

  // Aplicar filtros selecionados no Painel
  if (btnAplicar) {
    btnAplicar.addEventListener("click", () => {
      const selectRegiao = document.getElementById("filtro-regiao");
      const selectTipo = document.getElementById("filtro-classe");
      const radioStatus = document.querySelector(
        'input[name="status"]:checked',
      );

      filtroRegiao = selectRegiao ? selectRegiao.value : "";
      filtroTipo = selectTipo ? selectTipo.value : "";
      filtroStatus = radioStatus ? radioStatus.value : "";

      atualizarContadorFiltros();

      aplicarFiltros();
      fechar();
    });
  }

  // Limpar filtros do Painel
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      const selectRegiao = document.getElementById("filtro-regiao");
      const selectTipo = document.getElementById("filtro-classe");
      const radioTodosStatus = document.querySelector(
        'input[name="status"][value="todos"]',
      );

      if (selectRegiao) selectRegiao.value = "todas";
      if (selectTipo) selectTipo.value = "todos";
      if (radioTodosStatus) radioTodosStatus.checked = true;

      filtroRegiao = "";
      filtroTipo = "";
      filtroStatus = "";
      filtroBioma = "";

      if (contadorBadges) contadorBadges.textContent = "";

      const botaoTodos = document.querySelector(
        '.biome-btn[data-biome="todos"]',
      );
      if (botaoTodos) botaoTodos.click();
      else aplicarFiltros();
    });
  }
}

async function configurarBotaoAdmin() {
  const botao = document.getElementById("btn-adicionar-animal");
  const modal = document.getElementById("modal-adicionar-animal");

  if (!botao) return;

  botao.hidden = true;

  try {
    const response = await fetch("/verificar-admin", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) return;

    const dados = await response.json();

    window.usuarioEhAdmin = dados.admin === true;

    if (window.usuarioEhAdmin) {
      botao.hidden = false;
    }

    // Atualiza os cards depois de verificar o administrador
    aplicarFiltros();

    botao.addEventListener("click", () => {
      window.animalEmEdicao = null;

      const form = document.getElementById("form-adicionar-animal");

      form?.reset();

      document.getElementById("titulo-modal-animal").textContent =
        "Adicionar novo animal";

      document.getElementById("btn-salvar-animal").textContent =
        "Cadastrar animal";
      modal?.classList.remove("hidden");
    });
  } catch (erro) {
    console.error("Erro ao verificar administrador:", erro);
    botao.hidden = true;
  }
}

function configurarModalCadastro() {
  const modal = document.getElementById("modal-adicionar-animal");
  const btnFechar = document.getElementById("fechar-modal-adicionar");
  const btnCancelar = document.getElementById("cancelar-cadastro-animal");

  if (!modal) return;

  function fecharModal() {
    modal.classList.add("hidden");
  }

  btnFechar?.addEventListener("click", fecharModal);
  btnCancelar?.addEventListener("click", fecharModal);

  // Fecha ao clicar fora da caixa
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      fecharModal();
    }
  });

  // Fecha ao apertar ESC
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      fecharModal();
    }
  });
}

function configurarFormularioCadastro() {
  const form = document.getElementById("form-adicionar-animal");
  const modal = document.getElementById("modal-adicionar-animal");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const animalEmEdicao = window.animalEmEdicao;
    const estaEditando = Boolean(animalEmEdicao?.id);

    const dados = new FormData(form);

    try {
      const response = await fetch(
        estaEditando ? `/animais/${animalEmEdicao.id}` : "/adicionar-animal",
        {
          method: estaEditando ? "PUT" : "POST",
          credentials: "same-origin",
          body: dados,
        },
      );

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(
          resultado.erro ||
            (estaEditando
              ? "Erro ao editar animal."
              : "Erro ao cadastrar animal."),
        );
      }

      await window.siteAlert(
        estaEditando
          ? "Animal atualizado com sucesso!"
          : "Animal cadastrado com sucesso!",
        { type: "success", title: "Alterações salvas" },
      );

      // Limpa o estado de edição
      window.animalEmEdicao = null;

      // Limpa o formulário
      form.reset();

      // Restaura o título e o botão
      document.getElementById("titulo-modal-animal").textContent =
        "Adicionar novo animal";

      document.getElementById("btn-salvar-animal").textContent =
        "Cadastrar animal";

      modal?.classList.add("hidden");

      // Atualiza os cards
      await carregarAnimais();
    } catch (erro) {
      console.error("Erro ao salvar animal:", erro);
      await window.siteAlert(erro.message, {
        type: "error",
        title: "Não foi possível salvar",
      });
    }
  });
}

function configurarVisibilidadeBotaoAdmin() {
  const botao = document.getElementById("btn-adicionar-animal");
  const footer = document.getElementById("footer");

  if (!botao || !footer) return;

  const observador = new IntersectionObserver(
    ([entrada]) => {
      if (entrada.isIntersecting) {
        botao.classList.add("botao-oculto");
      } else {
        botao.classList.remove("botao-oculto");
      }
    },
    {
      threshold: 0,
    },
  );

  observador.observe(footer);
}

document.addEventListener("DOMContentLoaded", () => {
  configurarPesquisa();
  configurarBiomas();
  configurarVerMais();
  configurarDrawerFiltros();
  configurarBotaoAdmin();
  configurarModalCadastro();
  configurarFormularioCadastro();
  configurarVisibilidadeBotaoAdmin();
  carregarAnimais();
});
