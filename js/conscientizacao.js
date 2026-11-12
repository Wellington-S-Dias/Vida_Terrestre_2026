const REFRESH_MS = 5 * 60 * 1000;
const SLIDE_MS = 6500;
let species = [];
let offset = 0;
let paused = false;

const riskLabels = {
  "criticamente-em-perigo": ["Criticamente em perigo", "danger"],
  "em-perigo": ["Em perigo", "danger"],
  vulneravel: ["Vulnerável", "high"],
  "quase-ameacada": ["Quase ameaçada", "high"],
};
const threatStatuses = new Set(Object.keys(riskLabels));

function setUpdated() {
  const output = document.querySelector("#data-update");
  if (output)
    output.textContent = `Painel sincronizado às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date())} · nova consulta em 5 min`;
}

function renderSpecies() {
  const grid = document.querySelector("#species-grid");
  const counter = document.querySelector("#slider-count");
  if (!grid) return;
  if (!species.length) {
    grid.innerHTML =
      '<p class="species-loading">Nenhuma espécie ameaçada disponível no momento.</p>';
    grid.setAttribute("aria-busy", "false");
    if (counter) counter.textContent = "Nenhuma espécie ameaçada disponível";
    return;
  }
  const visible = Array.from(
    { length: Math.min(3, species.length) },
    (_, position) => species[(offset + position) % species.length],
  );
  grid.replaceChildren(
    ...visible.map((animal) => {
      const [risk, tone] = riskLabels[animal.status_class] || [
        animal.status || "Atenção",
        "high",
      ];
      const card = document.createElement("article");
      card.className = "species-card";
      const image = document.createElement("img");
      image.src = animal.imagem;
      image.alt = animal.nome;
      image.loading = "lazy";
      const content = document.createElement("div");
      content.innerHTML = `<span class="risk ${tone}">${risk}</span><h3>${animal.nome}</h3><p>${animal.ameacas || "A preservação do habitat é essencial para esta espécie."}</p>`;
      card.append(image, content);
      return card;
    }),
  );
  grid.setAttribute("aria-busy", "false");
  counter.textContent = `${species.length} espécies em risco cadastradas · troca automática ativa`;
}

async function loadSpecies() {
  const grid = document.querySelector("#species-grid");

  try {
    const response = await fetch("/animais_completos", { cache: "no-store" });
    if (!response.ok) throw new Error("Falha ao carregar espécies");
    const allSpecies = await response.json();
    species = allSpecies.filter(
      (animal) => threatStatuses.has(animal.status_class) && animal.imagem,
    );
    document.querySelector("#catalog-threatened").textContent = species.length;
    document.querySelector("#catalog-copy").textContent =
      "Espécies vulneráveis ou em perigo cadastradas e acompanhadas pelo projeto.";
    offset %= Math.max(species.length, 1);
    renderSpecies();
    setUpdated();
  } catch (error) {
    if (grid) {
      grid.innerHTML =
        '<p class="species-loading">Não foi possível sincronizar as espécies agora. Tente novamente em instantes.</p>';
      grid.setAttribute("aria-busy", "false");
    }
    console.error("Erro ao atualizar o painel de espécies:", error);
  }
}

document.querySelectorAll('.awareness-site a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelector("#slider-toggle")?.addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.setAttribute("aria-pressed", String(paused));
  event.currentTarget.textContent = paused
    ? "Retomar troca automática"
    : "Pausar troca automática";
});

loadSpecies();
setInterval(loadSpecies, REFRESH_MS);
setInterval(() => {
  if (!paused && species.length > 3) {
    offset = (offset + 3) % species.length;
    renderSpecies();
  }
}, SLIDE_MS);
