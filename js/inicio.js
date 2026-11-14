const sections = [
  {
    title: "Animais",
    text: "O mundo é repleto de animais diversos, cada um com seu papel no equilíbrio da vida.",
    videos: [
      "https://res.cloudinary.com/fvbohhhk/video/upload/w_1280,h_720,c_limit,q_auto,vc_h264/arara-azul_index.mp4",
    ],
  },
  {
    title: "Paisagens",
    text: "Poucos param para perceber as belezas naturais da Terra e tudo aquilo que elas sustentam.",
    videos: [
      "https://res.cloudinary.com/fvbohhhk/video/upload/w_1280,h_720,c_limit,q_auto,vc_h264/lencois-maranhenses.mp4",
    ],
  },
  {
    title: "Habitats",
    text: "Cada espécie depende de um habitat capaz de oferecer as condições necessárias para sua sobrevivência.",
    videos: [
      "https://res.cloudinary.com/fvbohhhk/video/upload/w_1280,h_720,c_limit,q_auto,vc_h264/floresta.mp4",
    ],
  },
  {
    title: "Conservação",
    text: "Preservar a vida terrestre é garantir que todas essas formas de vida continuem existindo no futuro.",
    videos: [
      "https://res.cloudinary.com/fvbohhhk/video/upload/w_1280,h_720,c_limit,q_auto,vc_h264/reflorestamento.mp4",
    ],
  },
];

const videos = document.querySelectorAll(".hero-video");
const title = document.querySelector(".hero-title");
const text = document.querySelector(".hero-text");
const slideNumber = document.querySelector(".slide-number");
const progressBar = document.querySelector(".slide-progress-bar");
const heroLoading = document.getElementById("hero-loading");

const sectionDuration = 7000;
// Mantém o crossfade alinhado à transição definida em css/inicio.css.
const transitionDuration = 1200;
const preloadLeadTime = 5000;

let currentSectionIndex = -1;
let currentVideoIndex = -1;

let sectionTimer = null;
let preloadTimer = null;
let transitionId = 0;

// Guarda a próxima seção e a URL já escolhida.
let preparedSectionIndex = -1;
let preparedVideoSrc = null;
let preparedVideoIndex = -1;

function getRandomVideo(section) {
  return section.videos[Math.floor(Math.random() * section.videos.length)];
}

function updateSectionContent(index) {
  const section = sections[index];

  if (title) title.textContent = section.title;
  if (text) text.textContent = section.text;

  if (slideNumber) {
    slideNumber.textContent = String(index + 1).padStart(2, "0");
  }
}

function startProgress() {
  if (!progressBar) return;

  progressBar.style.transition = "none";
  progressBar.style.width = "0%";

  // Força o navegador a aplicar o reset.
  void progressBar.offsetWidth;

  progressBar.style.transition = `width ${sectionDuration}ms linear`;

  progressBar.style.width = "100%";
}

function clearTimers() {
  clearTimeout(sectionTimer);
  clearTimeout(preloadTimer);
}

function clearPreparedVideo() {
  preparedSectionIndex = -1;
  preparedVideoSrc = null;
  preparedVideoIndex = -1;
}

function prepareNextVideo() {
  if (currentSectionIndex < 0 || videos.length < 2) return;

  const nextSectionIndex = (currentSectionIndex + 1) % sections.length;

  // Evita preparar novamente a mesma seção.
  if (preparedSectionIndex === nextSectionIndex) return;

  const nextSection = sections[nextSectionIndex];
  const nextVideoIndex = currentVideoIndex === 0 ? 1 : 0;

  const nextVideo = videos[nextVideoIndex];
  const src = getRandomVideo(nextSection);

  nextVideo.pause();
  nextVideo.classList.remove("active");

  preparedSectionIndex = nextSectionIndex;
  preparedVideoSrc = src;
  preparedVideoIndex = nextVideoIndex;

  if (nextVideo.getAttribute("src") !== src) {
    nextVideo.src = src;
    nextVideo.load();
  }

  // O carregamento começa antes da transição.
  nextVideo.preload = "auto";
}

function waitUntilPlayable(video, id) {
  return new Promise((resolve, reject) => {
    if (id !== transitionId) {
      reject(new Error("Transição cancelada"));
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve();
      return;
    }

    let timeout;

    function cleanup() {
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      clearTimeout(timeout);
    }

    function onReady() {
      cleanup();
      resolve();
    }

    function onError() {
      cleanup();
      reject(new Error("Falha ao carregar o vídeo"));
    }

    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onError);

    timeout = setTimeout(() => {
      cleanup();
      reject(new Error("O vídeo demorou demais para carregar"));
    }, 25000);

    // Evita perder um evento que já ocorreu.
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      cleanup();
      resolve();
    }
  });
}

function scheduleNextSection() {
  clearTimers();

  // Prepara o próximo vídeo três segundos antes.
  preloadTimer = setTimeout(
    () => {
      prepareNextVideo();
    },
    Math.max(0, sectionDuration - transitionDuration - preloadLeadTime),
  );

  // Começa o crossfade pouco antes de a barra chegar ao fim.
  sectionTimer = setTimeout(
    () => {
      const nextIndex = (currentSectionIndex + 1) % sections.length;

      loadSection(nextIndex);
    },
    Math.max(0, sectionDuration - transitionDuration),
  );
}

async function loadSection(index) {
  clearTimers();

  const id = ++transitionId;
  const section = sections[index];

  if (!section || videos.length < 2) return;

  let nextVideoIndex;
  let src;

  // Reutiliza o vídeo que já começou a ser carregado.
  if (preparedSectionIndex === index && preparedVideoSrc) {
    nextVideoIndex = preparedVideoIndex;
    src = preparedVideoSrc;
  } else {
    nextVideoIndex = currentVideoIndex === 0 ? 1 : 0;

    src = getRandomVideo(section);
  }

  const nextVideo = videos[nextVideoIndex];

  const previousVideo =
    currentVideoIndex >= 0 ? videos[currentVideoIndex] : null;

  nextVideo.pause();
  nextVideo.classList.remove("active");

  // Invalida o estado preparado para a próxima seção.
  clearPreparedVideo();

  if (nextVideo.getAttribute("src") !== src) {
    nextVideo.src = src;
    nextVideo.load();
  }

  try {
    await waitUntilPlayable(nextVideo, id);

    if (id !== transitionId) return;

    nextVideo.currentTime = 0;

    // Aguarda o navegador confirmar o início da reprodução.
    await nextVideo.play();

    if (id !== transitionId) {
      nextVideo.pause();
      return;
    }

    // Atualiza o texto somente quando o vídeo iniciar.
    currentSectionIndex = index;
    currentVideoIndex = nextVideoIndex;

    updateSectionContent(index);
    startProgress();

    nextVideo.classList.add("active");
    if (heroLoading) heroLoading.hidden = true;
    nextVideo
      .closest(".hero-video-container")
      ?.setAttribute("aria-busy", "false");

    if (previousVideo && previousVideo !== nextVideo) {
      setTimeout(() => {
        previousVideo.classList.remove("active");
        previousVideo.pause();
      }, transitionDuration);
    }

    // A próxima janela começa quando o crossfade atual termina,
    // mantendo cada seção com sectionDuration entre os inícios.
    setTimeout(scheduleNextSection, transitionDuration);
  } catch (error) {
    if (id !== transitionId) return;

    if (error.name !== "AbortError") {
      console.error("Erro ao trocar vídeo:", error);
    }

    // Tenta novamente sem avançar o texto.
    sectionTimer = setTimeout(() => {
      if (id === transitionId) {
        loadSection(index);
      }
    }, 1000);
  }
}

function initializeHome() {
  if (videos.length < 2 || sections.length === 0) {
    console.error("O slider precisa de dois elementos .hero-video.");
    return;
  }

  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
  });

  loadSection(0);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeHome, { once: true });
} else {
  initializeHome();
}
