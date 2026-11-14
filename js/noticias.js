(() => {
  const grid = document.querySelector("#news-grid");
  const empty = document.querySelector("#news-empty");
  const updated = document.querySelector("#last-update");
  const tabs = [...document.querySelectorAll(".news-tab")];
  const monitorSummary = document.querySelector("#monitor-summary");
  let articles = [];
  let activeCategory = "todas";
  let isLoading = true;

  const escapeHtml = (value) =>
    String(value || "").replace(
      /[&<>\"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[char],
    );

  const render = () => {
    if (isLoading) return;

    const visible =
      activeCategory === "todas"
        ? articles
        : articles.filter((article) => article.category === activeCategory);

    empty.hidden = visible.length > 0;
    empty.textContent = "Nenhuma notícia encontrada nesta categoria.";
    grid.innerHTML = visible
      .map(
        (article) => `
      <article class="news-card">
        <div class="news-card-image">
          <img src="${escapeHtml(article.image)}" alt="" loading="lazy">
          <span class="news-card-category">${escapeHtml(article.categoryLabel)}</span>
        </div>
        <div class="news-card-body">
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.summary)}</p>
          <div class="news-card-meta">
            <span>${escapeHtml(article.source)} · ${escapeHtml(article.date)}</span>
            <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">Ler notícia →</a>
          </div>
        </div>
      </article>
    `,
      )
      .join("");
    grid.setAttribute("aria-busy", "false");
  };

  const renderDashboard = (stats) => {
    if (!monitorSummary) return;
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    monitorSummary.textContent = `${stats?.total ?? articles.length} notícias monitoradas · última coleta às ${time}`;
  };

  const load = async () => {
    try {
      const response = await fetch("/api/noticias", { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao buscar notícias");
      const payload = await response.json();
      articles = Array.isArray(payload.articles) ? payload.articles : [];
      isLoading = false;
      const time = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
      updated.textContent = `Atualizado às ${time}`;
      renderDashboard(payload.stats);
      render();
    } catch (error) {
      isLoading = false;
      updated.textContent = "Não foi possível atualizar agora";
      if (!articles.length) grid.replaceChildren();
      grid.setAttribute("aria-busy", "false");
      empty.hidden = articles.length > 0;
      empty.textContent =
        "As notícias serão carregadas assim que a conexão estiver disponível.";
    }
  };

  const updateSelectedTab = (tab) => {
    activeCategory = tab.dataset.category;
    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    render();
  };

  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      if (isLoading) {
        updateSelectedTab(tab);
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduceMotion) {
        updateSelectedTab(tab);
        return;
      }

      if (typeof document.startViewTransition === "function") {
        document.startViewTransition(() => updateSelectedTab(tab));
        return;
      }

      grid.classList.add("is-switching");
      window.setTimeout(() => {
        updateSelectedTab(tab);
        grid.classList.remove("is-switching");
      }, 120);
    }),
  );

  load();
  window.setInterval(load, 5 * 60 * 1000);
})();
