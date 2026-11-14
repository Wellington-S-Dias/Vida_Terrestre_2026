document.addEventListener("DOMContentLoaded", () => {
  const layer = document.createElement("div");
  layer.className = "foliage-layer";
  layer.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 16; index += 1) {
    const leaf = document.createElement("span");
    leaf.className = "foliage-leaf";
    leaf.style.setProperty("--left", `${(index * 37 + 6) % 100}%`);
    leaf.style.setProperty("--fall-duration", `${19 + (index % 5) * 5}s`);
    leaf.style.setProperty("--fall-delay", `${-index * 2.5}s`);
    leaf.style.setProperty("--sway", `${index % 2 === 0 ? 1 : -1}`);
    leaf.style.setProperty("--leaf-scale", `${0.75 + (index % 4) * 0.22}`);
    layer.append(leaf);
  }

  document.body.append(layer);
});
