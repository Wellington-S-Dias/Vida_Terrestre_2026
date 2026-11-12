(() => {
  const grid = document.getElementById("profile-card-grid");
  const empty = document.getElementById("profile-cards-empty");
  if (!grid || !empty) return;
  const section = grid.closest(".account-cards-section");

  function createCard(animal) {
    const card = document.createElement("article");
    card.className = "profile-species-card";

    if (animal.imagem) {
      const image = document.createElement("img");
      image.src = animal.imagem;
      image.alt = animal.nome ? "Imagem de " + animal.nome : "Espécie";
      image.loading = "lazy";
      card.append(image);
    }

    const copy = document.createElement("div");
    copy.className = "profile-species-card-copy";
    const name = document.createElement("h3");
    name.textContent = animal.nome || "Espécie";
    copy.append(name);

    if (animal.nome_cientifico) {
      const scientificName = document.createElement("p");
      scientificName.textContent = animal.nome_cientifico;
      copy.append(scientificName);
    }

    card.append(copy);
    return card;
  }

  section?.setAttribute("aria-busy", "true");

  fetch("/usuario/cartas", { credentials: "same-origin" })
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          result.erro || "Entre na sua conta para ver suas cartinhas.",
        );
      return Array.isArray(result.cards) ? result.cards : [];
    })
    .then((cards) => {
      if (cards.length) {
        grid.replaceChildren(...cards.map(createCard));
        grid.hidden = false;
        empty.hidden = true;
      } else {
        empty.textContent =
          "Cartinhas das espécies concluídas corretamente aparecerão aqui.";
      }
      section?.setAttribute("aria-busy", "false");
    })
    .catch((error) => {
      empty.textContent =
        error.message || "Não foi possível carregar suas cartinhas.";
      section?.setAttribute("aria-busy", "false");
    });
})();
