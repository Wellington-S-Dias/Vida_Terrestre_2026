const cardsContainer = document.getElementById("cards-container");
const animalModal = document.getElementById("animal-modal");
const closeBtn = document.getElementById("close-modal-btn");
const modalImg = document.getElementById("modal-image");
const modalTitle = document.getElementById("modal-title");
const modalScientific = document.getElementById("modal-scientific");
const modalStatus = document.getElementById("modal-status");
const modalHabitat = document.getElementById("modal-habitat");
const modalBehavior = document.getElementById("modal-behavior");
const modalDistribution = document.getElementById("modal-distribution");
const modalBiomes = document.getElementById("modal-biome");
const modalDiet = document.getElementById("modal-diet");
const modalThreats = document.getElementById("modal-threats");
const modalRegionTotal = document.getElementById("modal-region-total");
const modalBiomeTotal = document.getElementById("modal-biome-total");
const modalRegionCount = document.getElementById("modal-region-count");
const modalBiomeCount = document.getElementById("modal-biome-count");
const modalDistributionSummary = document.getElementById(
  "modal-distribution-summary",
);
const modalThreatTags = document.getElementById("modal-threat-tags");
const modalThreatCount = document.getElementById("modal-threat-count");
const modalType = document.getElementById("modal-type");
const modalSize = document.getElementById("modal-size");
const modalDietType = document.getElementById("modal-diet-type");
const modalPhysical = document.getElementById("modal-physical");
const modalAdaptation = document.getElementById("modal-adaptation");
const modalCuriosity = document.getElementById("modal-curiosity");
const modalConservationGuidance = document.getElementById(
  "modal-conservation-guidance",
);
// Editor de animal
const btnEditarAnimal = document.getElementById("btn-editar-animal");
let animalSelecionado = null;
let modoEdicao = false;
//---------------------
function setModalText(element, value) {
  if (element) {
    element.textContent = value || "Informação ainda não cadastrada.";
  }
}

const regionCodes = {
  Norte: "N",
  Nordeste: "NE",
  "Centro-Oeste": "CO",
  Sudeste: "SE",
  Sul: "S",
};

function splitLabels(value) {
  return String(value || "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

function preencherFormularioEdicao(animal) {
  const form = document.getElementById("form-adicionar-animal");

  if (!form) return;

  // Limpa o formulário antes de preencher
  form.reset();

  // Preenche os campos de texto e áreas de texto
  const campos = {
    nome: animal.nome,
    nome_cientifico: animal.nome_cientifico,
    status: animal.status,
    status_class: animal.status_class,
    tipo: animal.tipo,
    imagem: animal.imagem,
    imagem_fonte: animal.imagem_fonte,
    imagem_credito: animal.imagem_credito,
    porte: animal.porte,
    habitat: animal.habitat,
    comportamento: animal.comportamento,
    caracteristicas_fisicas: animal.caracteristicas_fisicas,
    alimentacao: animal.alimentacao,
    dieta_tipo: animal.dieta_tipo,
    adaptacao: animal.adaptacao,
    ameacas: animal.ameacas,
    curiosidade: animal.curiosidade,
    orientacao_conservacao: animal.orientacao_conservacao,
  };

  Object.entries(campos).forEach(([nome, valor]) => {
    const campo = form.elements.namedItem(nome);

    if (campo) {
      campo.value = valor || "";
    }
  });

  // Marca as regiões cadastradas
  const regioes = splitLabels(animal.regiao);

  form.querySelectorAll('input[name="regiao"]').forEach((checkbox) => {
    checkbox.checked = regioes.includes(checkbox.value);
  });

  // Marca os biomas cadastrados
  const biomas = splitLabels(animal.bioma);

  form.querySelectorAll('input[name="bioma"]').forEach((checkbox) => {
    checkbox.checked = biomas.includes(checkbox.value);
  });
}

function normalizeLabel(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderDistributionChips(container, value, type) {
  if (!container) return [];

  const labels = splitLabels(value);
  container.replaceChildren();

  labels.forEach((label) => {
    const chip = document.createElement("span");
    chip.className = `modal-data-chip ${type}-chip ${type}-chip--${normalizeLabel(label)}`;
    chip.setAttribute("role", "listitem");

    if (type === "region") {
      const code = document.createElement("span");
      code.className = "region-chip-code";
      code.setAttribute("aria-hidden", "true");
      code.textContent = regionCodes[label] || "•";
      chip.append(code);
    } else {
      const marker = document.createElement("span");
      marker.className = "biome-chip-marker";
      marker.setAttribute("aria-hidden", "true");
      chip.append(marker);
    }

    const name = document.createElement("span");
    name.textContent = label;
    chip.append(name);
    container.append(chip);
  });

  return labels;
}

const threatCategories = [
  {
    id: "habitat",
    label: "Perda de habitat",
    match:
      /desmatamento|fragmenta|perda de habitat|degradação|conversão de áreas|destruição de habitat|alterações ambientais/i,
    icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-7h6v7",
  },
  {
    id: "capture",
    label: "Caça e captura",
    match:
      /caça|captura|tráfico|comércio ilegal|coleta de ovos|retirada ilegal|abate de indivíduos/i,
    icon: "M4 8h16M6 8V5h12v3M6 8v12h12V8M10 12v4m4-4v4",
  },
  {
    id: "roads",
    label: "Estradas e infraestrutura",
    match: /atropel|estradas?|rodovias?|colisões|redes elétricas|estruturas/i,
    icon: "M5 21 9 3m6 0 4 18M12 4v4m0 4v4m0 4v1",
  },
  {
    id: "fire",
    label: "Queimadas",
    match: /queimadas?|incêndios?/i,
    icon: "M12 22a7 7 0 0 0 7-7c0-2-1-4-3-6-.3 2-1.2 3.4-2.6 4.2C13 8 12 5 9 2c0 4-2 6-3 9a7 7 0 0 0 6 11Z",
  },
  {
    id: "water",
    label: "Pressão sobre as águas",
    match:
      /polui|barragens?|pesca acidental|redes de pesca|ambientes aquáticos|rios|áreas úmidas/i,
    icon: "M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12Z",
  },
  {
    id: "disease",
    label: "Doenças",
    match: /doenças?|febre amarela|surtos?/i,
    icon: "M10 3v4m4-4v4m-4 10v4m4-4v4M3 10h4m10 0h4M3 14h4m10 0h4M8 8h8v8H8z",
  },
  {
    id: "conflict",
    label: "Conflitos humanos",
    match: /conflitos?|perseguição|veneno|agropecuária|expansão|perseguidos/i,
    icon: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 20a6 6 0 0 1 12 0m1-4a5 5 0 0 1 5 4",
  },
  {
    id: "food",
    label: "Redução de alimento",
    match:
      /redução de (?:suas )?presas|redução de insetos|redução de palmeirais|redução de árvores usadas para alimentação/i,
    icon: "M12 21v-9m0 4c-5 0-7-3-7-7 4 0 7 2 7 7Zm0-3c0-5 3-8 8-9 0 5-3 9-8 10Z",
  },
];

function renderThreatCategories(value) {
  if (!modalThreatTags) return [];

  const categories = threatCategories.filter(({ match }) =>
    match.test(value || ""),
  );
  modalThreatTags.replaceChildren();

  categories.forEach(({ id, label, icon }) => {
    const chip = document.createElement("span");
    chip.className = `threat-chip threat-chip--${id}`;
    chip.setAttribute("role", "listitem");

    const graphic = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    graphic.setAttribute("viewBox", "0 0 24 24");
    graphic.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", icon);
    graphic.append(path);

    const name = document.createElement("span");
    name.textContent = label;
    chip.append(graphic, name);
    modalThreatTags.append(chip);
  });

  return categories;
}

function openModal(animal) {
  if (!animalModal) {
    return;
  }
  // Guarda o animal que está sendo visualizado
  animalSelecionado = animal;

  // Mostra o botão de edição somente para o administrador
  if (btnEditarAnimal) {
    btnEditarAnimal.hidden = !window.usuarioEhAdmin;
  }

  const nomeCientifico = animal.nome_cientifico || animal.nomeCientifico || "";

  const statusClass =
    animal.status_class || animal.statusClass || animal.status_categoria || "";

  if (modalImg) {
    const imageContainer = modalImg.closest(".modal-image-container");
    if (animal.imagem) {
      modalImg.src = animal.imagem;
      modalImg.alt = "Fotografia de " + (animal.nome || "animal");
      if (imageContainer) imageContainer.hidden = false;
    } else {
      modalImg.removeAttribute("src");
      if (imageContainer) imageContainer.hidden = true;
    }
  }

  if (modalTitle) {
    modalTitle.textContent = animal.nome || "Animal";
  }

  if (modalScientific) {
    modalScientific.textContent = nomeCientifico;
  }

  if (modalStatus) {
    modalStatus.textContent = animal.status || "Não informado";
    modalStatus.className = `status-badge ${statusClass}`.trim();
  }

  setModalText(modalType, animal.tipo);
  setModalText(modalSize, animal.porte);
  setModalText(modalHabitat, animal.habitat);
  setModalText(modalBehavior, animal.comportamento);
  const regions = renderDistributionChips(
    modalDistribution,
    animal.regiao,
    "region",
  );
  const biomes = renderDistributionChips(modalBiomes, animal.bioma, "biome");
  if (modalRegionTotal) modalRegionTotal.textContent = regions.length;
  if (modalBiomeTotal) modalBiomeTotal.textContent = biomes.length;
  if (modalRegionCount)
    modalRegionCount.textContent = `${regions.length} ${regions.length === 1 ? "região" : "regiões"}`;
  if (modalBiomeCount)
    modalBiomeCount.textContent = `${biomes.length} ${biomes.length === 1 ? "bioma" : "biomas"}`;
  if (modalDistributionSummary) {
    modalDistributionSummary.textContent =
      regions.length || biomes.length
        ? `Ocorrência cadastrada em ${regions.length} ${regions.length === 1 ? "região" : "regiões"} e ${biomes.length} ${biomes.length === 1 ? "bioma" : "biomas"}.`
        : "Distribuição ainda não cadastrada.";
  }
  setModalText(modalDiet, animal.alimentacao);
  setModalText(modalDietType, animal.dieta_tipo);
  setModalText(modalPhysical, animal.caracteristicas_fisicas);
  setModalText(modalAdaptation, animal.adaptacao);
  setModalText(modalCuriosity, animal.curiosidade);
  setModalText(modalThreats, animal.ameacas);
  const threats = renderThreatCategories(animal.ameacas);
  if (modalThreatCount) {
    modalThreatCount.textContent = `${threats.length} ${threats.length === 1 ? "pressão" : "pressões"} mapeadas`;
  }
  setModalText(modalConservationGuidance, animal.orientacao_conservacao);

  window.dispatchEvent(new CustomEvent("animal-opened", { detail: animal }));

  animalModal.classList.remove("hidden");
  animalModal.setAttribute("aria-hidden", "false");
}

function renderCards(animals) {
  if (!cardsContainer) {
    return;
  }

  cardsContainer.innerHTML = "";
  cardsContainer.setAttribute("aria-busy", "false");

  if (!animals.length) {
    cardsContainer.innerHTML = `
            <p class="no-results">
                Nenhuma espécie encontrada.
            </p>
        `;
    return;
  }

  animals.forEach((animal) => {
    const card = document.createElement("div");

    card.classList.add("card");

    const nomeCientifico =
      animal.nome_cientifico || animal.nomeCientifico || "";

    const statusClass =
      animal.status_class ||
      animal.statusClass ||
      animal.status_categoria ||
      "";

    card.innerHTML = `
            <div class="card-image-section">
                <img
                    src="${animal.imagem || "./src/images/animal-placeholder.svg"}"
                    alt="${animal.imagem ? animal.nome || "Animal" : "Imagem ainda não disponível para esta espécie"}"
                    class="card-image"
                >
            </div>

            <div class="card-info">
                <h3>
                    ${animal.nome || "Nome desconhecido"}
                </h3>

                <p class="scientific-name">
                    ${nomeCientifico}
                </p>

                <span class="status-badge ${statusClass}">
                    ${animal.status || "Não informado"}
                </span>
            </div>
        `;

    const animalId = Number(animal.id);
    if (
      Number.isInteger(animalId) &&
      (animalId % 2 === 0 || animalId % 5 === 0)
    ) {
      const quizBadge = document.createElement("span");
      quizBadge.className = "quiz-available-badge";
      quizBadge.textContent = "Quiz interativo";
      card.append(quizBadge);
    }

    // Verifica se o usuário é administrador
    if (window.usuarioEhAdmin) {
      const btnExcluir = document.createElement("button");

      btnExcluir.className = "btn-excluir-animal";
      btnExcluir.type = "button";
      btnExcluir.title = "Excluir animal";

      btnExcluir.innerHTML = '<i class="fa-regular fa-trash-can"></i>';

      btnExcluir.addEventListener("click", async (event) => {
        event.stopPropagation();

        const confirmar = await window.siteConfirm(
          `Tem certeza de que deseja excluir ${animal.nome}?`,
          {
            title: "Excluir espécie?",
            confirmText: "Excluir",
            cancelText: "Manter",
          },
        );

        if (!confirmar) return;

        try {
          const resposta = await fetch(`/animais/${animal.id}`, {
            method: "DELETE",
            credentials: "same-origin",
          });

          const dados = await resposta.json();

          if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao excluir animal.");
          }

          await window.siteAlert(dados.mensagem, {
            type: "success",
            title: "Espécie removida",
          });
          carregarAnimais();
        } catch (erro) {
          console.error("Erro ao excluir animal:", erro);
          await window.siteAlert(erro.message, {
            type: "error",
            title: "Não foi possível excluir",
          });
        }
      });

      card.appendChild(btnExcluir);
    }

    // Clique no card continua abrindo o modal
    card.addEventListener("click", () => {
      openModal(animal);
    });

    cardsContainer.appendChild(card);
  });
}

if (animalModal) {
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      animalModal.classList.add("hidden");
      animalModal.setAttribute("aria-hidden", "true");
    });
  }

  window.addEventListener("click", (event) => {
    if (event.target === animalModal) {
      animalModal.classList.add("hidden");
      animalModal.setAttribute("aria-hidden", "true");
    }
  });
}

const tabButtons = document.querySelectorAll(".tab-btn");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabButtons.forEach((btn) => {
      btn.classList.remove("active");
    });

    tabPanes.forEach((pane) => {
      pane.classList.remove("active");
    });

    button.classList.add("active");

    const tabId = `tab-${button.dataset.tab}`;

    const targetTab = document.getElementById(tabId);

    if (targetTab) {
      targetTab.classList.add("active");
    }
  });
});
if (btnEditarAnimal) {
  btnEditarAnimal.addEventListener("click", () => {
    if (!animalSelecionado || !window.usuarioEhAdmin) return;

    window.animalEmEdicao = animalSelecionado;

    const modalCadastro = document.getElementById("modal-adicionar-animal");

    if (!modalCadastro) return;

    // Ativa o modo de edição
    modoEdicao = true;

    // Preenche o formulário
    preencherFormularioEdicao(animalSelecionado);

    // Altera o título e o botão
    document.getElementById("titulo-modal-animal").textContent =
      "Editar animal";

    document.getElementById("btn-salvar-animal").textContent =
      "Salvar alterações";

    // Fecha o modal de detalhes
    animalModal.classList.add("hidden");
    animalModal.setAttribute("aria-hidden", "true");

    // Abre o formulário
    modalCadastro.classList.remove("hidden");
  });
}
