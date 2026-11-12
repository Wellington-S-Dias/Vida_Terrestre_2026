(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const revealSelector = [
    "main > section:not(.hero):not(:empty)",
    ".main-content > .input-area",
    ".main-content > .input-filter",
    ".main-content > .biome-buttons",
    ".main-content > .animal-cards",
    ".about-card-section > .about-cards",
    ".impact-cards > article",
    ".charts-grid > .chart-card",
    ".action-list > article",
    ".partners-grid > a",
    ".species-grid > .species-card",
    ".news-dashboard",
    ".map-panel",
    ".biome-legend > button",
    ".biome-detail",
    ".biome-fact",
    ".account-content",
    ".account-cards-section",
    ".profile-card-grid > .profile-species-card",
    ".login-page > *",
    ".login-page .info-card",
    ".login-page .login-card",
    ".footer-main > *",
    ".card",
  ].join(",");

  document.documentElement.classList.add("site-motion");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
  );

  function observeTargets(root) {
    const targets = [];
    if (root instanceof Element && root.matches(revealSelector))
      targets.push(root);
    if (root.querySelectorAll)
      targets.push(...root.querySelectorAll(revealSelector));

    targets.forEach((target) => {
      if (target.classList.contains("site-reveal")) return;
      const siblings = [...target.parentElement.children].filter((item) =>
        item.matches(revealSelector),
      );
      const order = Math.max(0, siblings.indexOf(target));
      target.style.setProperty(
        "--motion-delay",
        `${Math.min(order, 5) * 65}ms`,
      );
      target.classList.add("site-reveal");
      observer.observe(target);
    });
  }

  observeTargets(document);

  const additions = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) observeTargets(node);
      });
    });
  });

  additions.observe(document.body, { childList: true, subtree: true });
})();
