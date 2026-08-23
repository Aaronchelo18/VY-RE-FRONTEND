window.VyoreAlert = (() => {
  function ensureRoot() {
    let root = document.querySelector(".vyore-alert-root");
    if (!root) {
      root = document.createElement("div");
      root.className = "vyore-alert-root";
      document.body.appendChild(root);
    }
    return root;
  }

  function iconFor(type) {
    const icons = {
      success: "✓",
      error: "!",
      warning: "!",
      info: "i",
    };
    return icons[type] || icons.info;
  }

  function buildDialog({ title, text, html, type, confirmText, cancelText, mode, className = "" }) {
    const dialog = document.createElement("section");
    dialog.className = `vyore-alert vyore-alert-${type} ${className}`.trim();
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "vyoreAlertTitle");
    dialog.innerHTML = `
      <div class="vyore-alert-icon" aria-hidden="true">${iconFor(type)}</div>
      <h2 id="vyoreAlertTitle"></h2>
      <div class="vyore-alert-message"></div>
      <div class="vyore-alert-actions"></div>
    `;

    dialog.querySelector("h2").textContent = title;
    const message = dialog.querySelector(".vyore-alert-message");
    if (html) {
      message.innerHTML = html;
    } else {
      message.textContent = text;
    }

    const actions = dialog.querySelector(".vyore-alert-actions");
    if (mode === "confirm") {
      const cancel = document.createElement("button");
      cancel.className = "vyore-alert-cancel";
      cancel.type = "button";
      cancel.textContent = cancelText;
      actions.appendChild(cancel);
    }

    const confirm = document.createElement("button");
    confirm.className = "vyore-alert-confirm";
    confirm.type = "button";
    confirm.textContent = confirmText;
    actions.appendChild(confirm);

    return dialog;
  }

  function openAlert(options, mode) {
    const settings = {
      title: mode === "confirm" ? "Confirmar" : "Aviso",
      text: "",
      type: mode === "confirm" ? "warning" : "info",
      confirmText: mode === "confirm" ? "Sí" : "Aceptar",
      cancelText: "Cancelar",
      ...options,
    };

    return new Promise((resolve) => {
      const root = ensureRoot();
      root.innerHTML = "";
      root.hidden = false;

      const dialog = buildDialog({ ...settings, mode });
      const confirm = dialog.querySelector(".vyore-alert-confirm");
      const cancel = dialog.querySelector(".vyore-alert-cancel");
      let closed = false;

      function close(value) {
        if (closed) return;
        closed = true;
        document.removeEventListener("keydown", onKey);
        root.removeEventListener("click", onBackdrop);
        root.classList.remove("show");
        window.setTimeout(() => {
          root.hidden = true;
          root.innerHTML = "";
          resolve(value);
        }, 160);
      }

      function onKey(event) {
        if (event.key === "Escape") close(mode === "confirm" ? false : true);
      }

      function onBackdrop(event) {
        if (event.target === root) close(mode === "confirm" ? false : true);
      }

      confirm.addEventListener("click", () => close(true));
      if (cancel) cancel.addEventListener("click", () => close(false));
      root.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKey);

      root.appendChild(dialog);
      window.requestAnimationFrame(() => root.classList.add("show"));
      confirm.focus();
    });
  }

  function fire(options = {}) {
    return openAlert(options, "fire");
  }

  function confirm(options = {}) {
    return openAlert(options, "confirm");
  }

  return { fire, confirm };
})();

