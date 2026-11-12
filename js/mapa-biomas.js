document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("biome-map");
  if (!container) return;

  try {
    const response = await fetch("/src/images/biomas/mapa-biomas.svg");
    if (!response.ok) throw new Error("Não foi possível carregar o mapa.");
    container.innerHTML = await response.text();
    container.setAttribute("aria-busy", "false");

    const biomas = {
      inicio: {
        nome: "Explore os biomas brasileiros",
        chamada: "Selecione uma região no mapa para descobrir mais.",
        imagem: "./src/images/index/padrao.jpg",
        imagemInferior: "./src/images/index/padrao.jpg",
        descricao:
          "O Brasil reúne seis biomas, cada um com paisagens, clima e espécies próprias. Selecione uma região no mapa para conhecer melhor sua natureza.",
        clima:
          "Do tropical úmido ao subtropical, varia entre as regiões do país.",
        vegetacao:
          "Florestas, savanas, campos e áreas alagáveis compõem diferentes paisagens.",
        fauna: "Uma grande variedade de espécies vive nos biomas brasileiros.",
        ocorrencia:
          "Os seis biomas se distribuem por todas as regiões do Brasil.",
        curiosidade:
          "Cada bioma combina condições próprias de clima, solo, vegetação e fauna.",
      },
      amazonia: {
        nome: "Amazônia",
        chamada: "Floresta, rios e vida em abundância.",
        logo: "./src/images/Onça-Pintada (Amazônia).png",
        imagem: "./src/images/index/amazônia.png",
        imagemInferior: "./src/images/biomes/amazonia1.jpg",
        descricao:
          "A Amazônia é a maior floresta tropical do mundo e ocupa grande parte do Norte do Brasil. Seus rios e florestas sustentam uma das maiores diversidades de espécies do planeta.",
        clima:
          "Quente e úmido durante a maior parte do ano, com chuvas abundantes.",
        vegetacao: "Floresta densa, árvores altas, rios e áreas alagáveis.",
        fauna:
          "Onça-pintada, boto, harpia, macacos e milhares de outras espécies.",
        ocorrencia: "Principalmente na região Norte, na bacia do rio Amazonas.",
        curiosidade:
          "A bacia amazônica concentra cerca de um quinto da água doce superficial do planeta.",
      },
      cerrado: {
        nome: "Cerrado",
        chamada: "Savana brasileira de vida extraordinária.",
        logo: "./src/images/Tamanduá-Bandeira(Cerrado).png",
        imagem: "./src/images/index/cerrado.jpg",
        imagemInferior: "./src/images/biomes/cerrado1.webp",
        descricao:
          "O Cerrado é uma savana muito rica em espécies, formada por campos, árvores retorcidas e matas próximas aos rios. Suas paisagens mudam bastante entre a estação seca e a chuvosa.",
        clima: "Tropical, com verão chuvoso e inverno seco.",
        vegetacao:
          "Campos, arbustos e árvores de casca grossa e raízes profundas.",
        fauna: "Lobo-guará, tamanduá-bandeira, tatu-canastra e seriema.",
        ocorrencia:
          "Predomina no Brasil Central e alcança áreas de outras regiões.",
        curiosidade:
          "O Cerrado é conhecido como o berço das águas por abrigar nascentes de grandes bacias brasileiras.",
      },
      caatinga: {
        nome: "Caatinga",
        chamada: "Resistência e adaptação no semiárido.",
        logo: "./src/images/Lobo-Guara(Caatinga).png",
        imagem: "./src/images/index/caatinga.jpg",
        imagemInferior: "./src/images/biomes/caatinga.jpg",
        descricao:
          "Exclusiva do Brasil, a Caatinga ocupa grande parte do Nordeste. Plantas e animais apresentam adaptações para enfrentar as altas temperaturas e a irregularidade das chuvas.",
        clima: "Semiárido, quente, com chuvas escassas e irregulares.",
        vegetacao:
          "Arbustos espinhosos, cactos e plantas que perdem as folhas na seca.",
        fauna:
          "Asa-branca, tatu-peba, mocó, preá e diversas espécies endêmicas.",
        ocorrencia:
          "Principalmente no interior do Nordeste e no norte de Minas Gerais.",
        curiosidade:
          "O nome Caatinga vem do tupi e significa “mata branca”, referência à paisagem na estação seca.",
      },
      "mata-atlantica": {
        nome: "Mata Atlântica",
        chamada: "Diversidade, água e vida em abundância.",
        logo: "./src/images/Mico-Leão-Dourado(Mata Atlântica).png",
        imagem: "./src/images/index/mata_atlantica.jpg",
        imagemInferior: "./src/images/biomes/mataatlantica2.webp",
        descricao:
          "A Mata Atlântica é um dos biomas mais ricos em biodiversidade do planeta. Originalmente, cobria grande parte da costa brasileira, mas hoje resta apenas uma parte de sua cobertura original. Mesmo assim, ainda abriga milhares de espécies de plantas e animais, muitas delas endêmicas.",
        clima: "Tropical e subtropical, com umidade e chuvas bem distribuídas.",
        vegetacao: "Florestas densas, matas ciliares, restingas e manguezais.",
        fauna:
          "Muriqui, mico-leão-dourado, onça-pintada e muitas aves e anfíbios.",
        ocorrencia:
          "Acompanha o litoral e se estende por áreas de 17 estados brasileiros.",
        curiosidade:
          "Mesmo muito reduzida, a Mata Atlântica ainda abriga milhares de espécies endêmicas e ajuda a proteger mananciais de água.",
      },
      pantanal: {
        nome: "Pantanal",
        chamada: "O ritmo das águas move a vida.",
        logo: "./src/images/Tuiuiú(Pantanal).png",
        imagem: "./src/images/index/pantanal.jpeg",
        imagemInferior: "./src/images/biomes/pantanal1.webp",
        descricao:
          "O Pantanal é uma das maiores planícies alagáveis do planeta. O ciclo anual de cheias e secas transforma a paisagem e cria condições para uma fauna muito abundante.",
        clima: "Tropical continental, com verão chuvoso e inverno mais seco.",
        vegetacao:
          "Campos inundáveis, capões de mata, cerradões e matas ciliares.",
        fauna:
          "Tuiuiú, arara-azul, capivara, jacaré-do-pantanal e onça-pintada.",
        ocorrencia:
          "Oeste de Mato Grosso e Mato Grosso do Sul, na bacia do Alto Paraguai.",
        curiosidade:
          "As cheias anuais conectam rios, baías e campos e renovam os ambientes pantaneiros.",
      },
      pampa: {
        nome: "Pampa",
        chamada: "Campos naturais e horizontes do Sul.",
        logo: "./src/images/Veado-Campeiro (Pampa).png",
        imagem: "./src/images/index/pampa.webp",
        imagemInferior: "./src/images/biomes/pampa1.jpg",
        descricao:
          "O Pampa brasileiro é formado principalmente por campos naturais, com gramíneas, plantas rasteiras e áreas úmidas. Essa paisagem aberta abriga uma biodiversidade própria.",
        clima: "Subtropical, com estações bem marcadas e invernos frios.",
        vegetacao: "Campos de gramíneas e ervas, banhados e matas de galeria.",
        fauna: "Veado-campeiro, ema, graxaim-do-campo e quero-quero.",
        ocorrencia:
          "Metade sul do Rio Grande do Sul, na região da Campanha Gaúcha.",
        curiosidade:
          "Os campos do Pampa são ecossistemas naturais antigos, com plantas adaptadas ao pastejo e ao fogo.",
      },
    };
    const titulo = document.getElementById("biome-title");
    const estadoSelecao = document.getElementById("biome-selection-state");
    const svg = container.querySelector("svg");
    const imagemMascote = document.getElementById("biome-mascot");
    const botoesBioma = document.querySelectorAll("[data-biome-select]");
    const regioes = container.querySelectorAll("svg path[id]");
    let temporizadorLogo;
    const posicoesRotulos = {
      amazonia: [390, 298],
      cerrado: [609, 503],
      caatinga: [808, 373],
      "mata-atlantica": [649, 672],
      pantanal: [444, 582],
      pampa: [506, 852],
    };
    Object.entries(posicoesRotulos).forEach(([codigo, [x, y]]) => {
      const rotulo = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      rotulo.setAttribute("x", x);
      rotulo.setAttribute("y", y);
      rotulo.setAttribute("class", "biome-map-label");
      rotulo.setAttribute("data-biome-label", codigo);
      rotulo.setAttribute("text-anchor", "middle");
      rotulo.setAttribute("aria-hidden", "true");
      rotulo.textContent = biomas[codigo].nome;
      svg.append(rotulo);
    });
    let biomaSelecionado = null;
    let temporizadorTransicaoInfo;
    const detalheBioma = document.querySelector(".biome-detail");

    const selecionar = (codigo, atualizarTema = true) => {
      const bioma = biomas[codigo];
      if (!bioma) return;
      document.body.dataset.biome = atualizarTema ? codigo : "default";
      titulo.textContent = bioma.nome;
      if (estadoSelecao) {
        estadoSelecao.textContent =
          codigo === "inicio" ? "" : `${bioma.nome} selecionado`;
      }
      if (imagemMascote) {
        window.clearTimeout(temporizadorLogo);
        if (bioma.logo) {
          imagemMascote.hidden = false;
          imagemMascote.style.opacity = "0";
          temporizadorLogo = window.setTimeout(() => {
            imagemMascote.src = bioma.logo;
            imagemMascote.alt = `Espécie símbolo do bioma ${bioma.nome}`;
            imagemMascote.style.opacity = "1";
          }, 120);
        } else {
          imagemMascote.hidden = true;
          imagemMascote.removeAttribute("src");
        }
      }
      document.getElementById("biome-tagline").textContent = bioma.chamada;
      document.getElementById("biome-description").textContent =
        bioma.descricao;
      document.getElementById("biome-climate").textContent = bioma.clima;
      document.getElementById("biome-vegetation").textContent = bioma.vegetacao;
      document.getElementById("biome-fauna").textContent = bioma.fauna;
      document.getElementById("biome-range").textContent = bioma.ocorrencia;
      document.getElementById("biome-curiosity").textContent =
        bioma.curiosidade;
      document.getElementById("biome-hero-image").src = bioma.imagem;
      const imagemInferior = document.getElementById("biome-bottom-image");
      imagemInferior.src = bioma.imagemInferior;
      imagemInferior.alt = `Paisagem do bioma ${bioma.nome}`;
      regioes.forEach((item) => {
        const ativo = item.id === codigo;
        item.classList.toggle("is-selected", ativo);
        item.setAttribute("aria-pressed", String(ativo));
      });
      svg.querySelectorAll(".biome-map-label").forEach((rotulo) => {
        rotulo.classList.toggle(
          "is-selected",
          rotulo.dataset.biomeLabel === codigo,
        );
      });
      botoesBioma.forEach((botao) => {
        botao.setAttribute(
          "aria-pressed",
          String(botao.dataset.biomeSelect === codigo),
        );
      });
      if (codigo !== "inicio") {
        window.dispatchEvent(
          new CustomEvent("biome-selected", {
            detail: { code: codigo, name: bioma.nome },
          }),
        );
      }

      if (detalheBioma && biomaSelecionado && biomaSelecionado !== codigo) {
        window.clearTimeout(temporizadorTransicaoInfo);
        detalheBioma.classList.remove("is-changing");
        void detalheBioma.offsetWidth;
        detalheBioma.classList.add("is-changing");
        temporizadorTransicaoInfo = window.setTimeout(() => {
          detalheBioma.classList.remove("is-changing");
        }, 450);
      }
      biomaSelecionado = codigo;
    };
    if (svg) {
      svg.setAttribute("role", "group");
      svg.setAttribute("aria-label", "Mapa interativo dos biomas brasileiros");
    }
    regioes.forEach((regiao) => {
      if (!biomas[regiao.id]) return;
      regiao.setAttribute("role", "button");
      regiao.setAttribute("tabindex", "0");
      regiao.setAttribute(
        "aria-label",
        `Mostrar informações sobre ${biomas[regiao.id].nome}`,
      );
      regiao.setAttribute("aria-pressed", "false");
      regiao.classList.add("biome-map-region");
      regiao.addEventListener("click", () => selecionar(regiao.id));
      regiao.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selecionar(regiao.id);
        }
      });
    });
    botoesBioma.forEach((botao) => {
      botao.addEventListener("click", () =>
        selecionar(botao.dataset.biomeSelect),
      );
    });
    selecionar("inicio", false);
  } catch (error) {
    container.textContent = "O mapa dos biomas não pôde ser carregado.";
    container.setAttribute("aria-busy", "false");
    console.error(error);
  }
});
