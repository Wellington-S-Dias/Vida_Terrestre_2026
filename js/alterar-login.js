function switchTab(tabName, element) {
  const buttons = document.querySelectorAll(".tab-btn");
  const glider = document.querySelector(".glider");
  const slider = document.getElementById("formsSlider");

  // 1. Atualiza estado dos botões
  buttons.forEach((btn) => btn.classList.remove("active"));
  if (element) {
    element.classList.add("active");
  }

  // 2. Anima a pílula azul para os lados
  if (tabName === "cadastrar") {
    glider.style.transform = "translateX(100%)";
    if (slider) slider.style.transform = "translateX(-50%)"; // desliza os formulários
  } else {
    glider.style.transform = "translateX(0)";
    if (slider) slider.style.transform = "translateX(0%)"; // volta os formulários
  }
}
