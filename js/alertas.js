(() => {
  const queue = [];
  let dialog;
  let current = null;
  let returnFocus = null;

  function createDialog() {
    dialog = document.createElement("dialog");
    dialog.className = "site-alert-dialog";
    dialog.setAttribute("aria-labelledby", "site-alert-title");
    dialog.setAttribute("aria-describedby", "site-alert-message");
    dialog.innerHTML =
      '<div class="site-alert-heading"><span class="site-alert-icon" aria-hidden="true"></span><div><span class="site-alert-kicker">Vida Terrestre</span><h2 class="site-alert-title" id="site-alert-title"></h2></div></div><p class="site-alert-message" id="site-alert-message"></p><div class="site-alert-actions"><button class="site-alert-cancel" type="button"></button><button class="site-alert-confirm" type="button"></button></div>';
    document.body.append(dialog);

    const cancelButton = dialog.querySelector(".site-alert-cancel");
    const confirmButton = dialog.querySelector(".site-alert-confirm");
    cancelButton.addEventListener("click", () => finish(false));
    confirmButton.addEventListener("click", () => finish(true));
    dialog.addEventListener("cancel", () => {
      if (current) current.result = false;
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog && current?.kind === "confirm") finish(false);
    });
    dialog.addEventListener("close", () => {
      const completed = current;
      current = null;
      completed?.resolve(completed.result ?? false);
      window.setTimeout(
        () => {
          if (queue.length) showNext();
          else {
            if (returnFocus?.isConnected)
              returnFocus.focus({ preventScroll: true });
            returnFocus = null;
          }
        },
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320,
      );
    });
  }

  function finish(result) {
    if (!dialog?.open || !current) return;
    current.result = result;
    dialog.close();
  }

  function showNext() {
    if (current || !queue.length) return;
    if (!dialog) createDialog();
    current = queue.shift();
    const { kind, message, title, type, confirmText, cancelText } = current;
    const icon = dialog.querySelector(".site-alert-icon");
    const cancelButton = dialog.querySelector(".site-alert-cancel");
    const confirmButton = dialog.querySelector(".site-alert-confirm");
    const icons = { success: "✓", warning: "!", error: "×", info: "i" };
    const titles = {
      success: "Tudo certo",
      warning: "Atenção",
      error: "Algo deu errado",
      info: "Aviso",
    };
    dialog.dataset.type = type;
    icon.textContent = icons[type];
    dialog.querySelector(".site-alert-title").textContent =
      title || (kind === "confirm" ? "Confirmar ação" : titles[type]);
    dialog.querySelector(".site-alert-message").textContent = message;
    cancelButton.hidden = kind !== "confirm";
    cancelButton.textContent = cancelText || "Cancelar";
    confirmButton.textContent =
      confirmText || (kind === "confirm" ? "Confirmar" : "Entendi");
    dialog.showModal();
    window.requestAnimationFrame(() =>
      (kind === "confirm" ? cancelButton : confirmButton).focus({
        preventScroll: true,
      }),
    );
  }

  function enqueue(options) {
    return new Promise((resolve) => {
      if (!current && !queue.length) returnFocus = document.activeElement;
      const allowedTypes = ["success", "warning", "error", "info"];
      queue.push({
        ...options,
        type: allowedTypes.includes(options.type) ? options.type : "info",
        resolve,
      });
      showNext();
    });
  }

  window.siteAlert = (message, options = {}) =>
    enqueue({ ...options, kind: "alert", message: String(message ?? "") });
  window.siteConfirm = (message, options = {}) =>
    enqueue({
      ...options,
      kind: "confirm",
      message: String(message ?? ""),
      type: options.type || "warning",
    }).then(Boolean);
})();
