(() => {
  const link = document.querySelector(".nav-menu .entrar");
  if (!link) return;

  const storageKey = "vidaTerrestreUsuario";
  const defaultLinkMarkup = link.innerHTML;
  let logoutButton = null;
  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.has("logout")) {
    localStorage.removeItem(storageKey);
    currentUrl.searchParams.delete("logout");
    window.history.replaceState({}, "", currentUrl);
  }

  function readAccount() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {
      localStorage.removeItem(storageKey);
      return null;
    }
  }

  function confirmLogout() {
    return window.siteConfirm(
      "Tem certeza de que deseja encerrar sua sessão?",
      {
        title: "Sair da conta?",
        confirmText: "Sair da conta",
        cancelText: "Continuar conectado",
      },
    );
  }

  function renderAccount(account) {
    if (!account?.name) {
      link.classList.remove("has-account");
      link.href = "entrar.html";
      link.setAttribute("aria-label", "Entrar");
      link.innerHTML = defaultLinkMarkup;
      logoutButton?.remove();
      logoutButton = null;
      return;
    }

    const name = account.name.trim();
    link.classList.add("has-account");
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    link.href = "conta.html";
    link.setAttribute("aria-label", `Conta de ${name}`);
    link.replaceChildren();

    if (account.photo) {
      const avatar = document.createElement("img");
      avatar.className = "account-avatar";
      avatar.src = account.photo;
      avatar.alt = "";
      link.append(avatar);
    } else {
      const avatar = document.createElement("span");
      avatar.className = "account-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = initials;
      link.append(avatar);
    }

    const label = document.createElement("span");
    label.className = "nav-label";
    label.textContent = name;
    link.append(label);

    if (!logoutButton) {
      logoutButton = document.createElement("button");
      logoutButton.className = "logout-account";
      logoutButton.type = "button";
      logoutButton.setAttribute("aria-label", "Sair da conta");
      logoutButton.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3m9-8h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7"/></svg><span class="nav-label">Sair da conta</span>';
      logoutButton.addEventListener("click", async () => {
        const confirmed = await confirmLogout();
        if (!confirmed) return;

        logoutButton.disabled = true;
        localStorage.removeItem(storageKey);
        renderAccount(null);

        try {
          await fetch("/logout", { credentials: "same-origin" });
        } catch {
          // A navegação e a limpeza local ainda funcionam sem resposta do servidor.
        } finally {
          window.location.assign("entrar.html?logout=1");
        }
      });
      link.closest(".nav-menu").append(logoutButton);
    }
  }

  renderAccount(readAccount());

  // Busca também logins Google/GitHub, cuja conta fica na sessão do servidor.
  fetch("/usuario", { credentials: "same-origin" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      const user = data?.usuario;
      if (!data?.logado || !user) return;

      const account = {
        name:
          user.name ||
          user.displayName ||
          user.username ||
          user.email?.split("@")[0],
        email: user.email || user.emails?.[0]?.value || "",
        photo:
          user.photo || user.photos?.[0]?.value || user._json?.avatar_url || "",
      };
      if (!account.name) return;

      localStorage.setItem(storageKey, JSON.stringify(account));
      renderAccount(account);
    })
    .catch(() => {});

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) renderAccount(readAccount());
  });

  window.addEventListener("account-updated", (event) => {
    renderAccount(event.detail || readAccount());
  });
})();
