#!/usr/bin/env node

require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");

const API = "https://api.inaturalist.org/v1";
const PASTA_RELATORIOS = path.join(__dirname, "..", "relatorios-imagens");
const NOMES_TAXONOMICOS_ATUAIS = {
  "Chelonoidis carbonaria": "Chelonoidis carbonarius",
  "Aburria jacutinga": "Pipile jacutinga",
};
const MAX_TENTATIVAS_API = 4;
const MAX_CANDIDATAS_POR_ANIMAL = 6;
let ultimaConsultaApi = 0;
const TERMOS_SUSPEITOS =
  /\b(dead|deceased|carcass|carcase|roadkill|road-kill|killed|hunted|hunting|skull|skeleton|taxidermy|specimen|cadaver|carca[cç]a|morto|morta|morte|atropelad[oa]|ca[cç]ad[oa]|esqueleto|cr[aâ]nio|taxidermia)\b/i;
const LICENCAS_PERMITIDAS = new Set([
  "cc0",
  "cc-by",
  "cc-by-sa",
  "cc-by-nc",
  "cc-by-nc-sa",
  "cc-by-nd",
  "cc-by-nc-nd",
]);

function lerArgumentos() {
  const argumentos = process.argv.slice(2);
  const opcoes = {
    aplicar: false,
    forcar: false,
    selecoes: null,
    limite: Infinity,
    animalId: null,
  };

  for (let indice = 0; indice < argumentos.length; indice += 1) {
    const argumento = argumentos[indice];

    if (argumento === "--aplicar") {
      opcoes.aplicar = true;
    } else if (argumento === "--prever") {
      opcoes.aplicar = false;
    } else if (argumento === "--forcar") opcoes.forcar = true;
    else if (argumento === "--selecoes") opcoes.selecoes = argumentos[++indice];
    else if (argumento === "--limite")
      opcoes.limite = Number(argumentos[++indice]);
    else if (argumento === "--animal")
      opcoes.animalId = Number(argumentos[++indice]);
    else if (argumento === "--ajuda" || argumento === "-h") {
      console.log(`Uso: node scripts/importar-imagens-animais.js [opções]

Opções:
  --prever        Gera a galeria sem alterar o banco (padrão).
  --aplicar       Grava as imagens escolhidas na galeria.
  --selecoes ARQ  Arquivo JSON baixado pela galeria (obrigatório com --aplicar).
  --animal ID     Processa somente o animal com esse ID.
  --limite N      Limita a quantidade de animais processados.
  --forcar        Inclui imagens já cadastradas na revisão; ao aplicar, permite substituí-las.
  --ajuda         Mostra esta ajuda.

Por padrão, só mostra animais sem imagem e não grava automaticamente.
Use --forcar para incluir animais que já têm imagem na galeria.
`);
      process.exit(0);
    } else {
      throw new Error(`Opção desconhecida: ${argumento}`);
    }
  }

  if (!Number.isInteger(opcoes.limite) && opcoes.limite !== Infinity) {
    throw new Error("--limite precisa ser um número inteiro positivo.");
  }
  if (opcoes.limite < 1)
    throw new Error("--limite precisa ser maior que zero.");
  if (opcoes.animalId !== null && !Number.isInteger(opcoes.animalId)) {
    throw new Error("--animal precisa ser um ID numérico.");
  }
  if (opcoes.aplicar && !opcoes.selecoes) {
    throw new Error(
      "Informe o JSON baixado da galeria com --selecoes caminho.json.",
    );
  }
  return opcoes;
}

function obterConexao() {
  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vida_terrestre",
    charset: "utf8mb4",
  });
}

function pontuarFoto(observacao, foto) {
  const texto = [
    observacao.description,
    observacao.taxon?.name,
    foto.attribution,
    foto.url,
  ]
    .filter(Boolean)
    .join(" ");

  if (TERMOS_SUSPEITOS.test(texto)) return null;
  if (!LICENCAS_PERMITIDAS.has(String(foto.license_code || "").toLowerCase()))
    return null;

  const dimensoes = foto.original_dimensions || {};
  const largura = Number(dimensoes.width || 0);
  const altura = Number(dimensoes.height || 0);
  if (
    !largura ||
    !altura ||
    Math.min(largura, altura) < 700 ||
    Math.max(largura, altura) < 1200
  )
    return null;

  // Use o original: a variante `large` do iNaturalist pode ter menos pixels
  // que as dimensões originais usadas pelos filtros abaixo.
  const url = String(foto.url || "").replace(
    /\/(?:square|small|medium|large)\.(jpg|jpeg|png|webp)(?=[?#]|$)/i,
    "/original.$1",
  );
  if (!/^https:\/\//i.test(url)) return null;

  let pontos = 100;
  pontos += Math.min(40, Math.floor((largura * altura) / 50000));
  pontos += Math.min(30, Number(observacao.identifications_count || 0) * 2);
  pontos += Number(foto.position === 0) * 5;

  return {
    url,
    urlMiniatura: String(foto.url || ""),
    pontos,
    largura,
    altura,
    licenca: foto.license_code,
    credito: foto.attribution || "Crédito não informado pelo iNaturalist",
    observacaoUrl: `https://www.inaturalist.org/observations/${observacao.id}`,
    observacaoId: observacao.id,
  };
}

async function consultarApi(url) {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_API; tentativa += 1) {
    try {
      const intervalo = Date.now() - ultimaConsultaApi;
      if (intervalo < 1000)
        await new Promise((resolve) => setTimeout(resolve, 1000 - intervalo));
      ultimaConsultaApi = Date.now();
      const resposta = await fetch(url, {
        headers: {
          "User-Agent": "VidaTerrestreImageImporter/2.1 (projeto educacional)",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (resposta.status === 429 || resposta.status >= 500) {
        throw new Error(`iNaturalist respondeu HTTP ${resposta.status}`);
      }
      if (!resposta.ok)
        throw new Error(`iNaturalist respondeu HTTP ${resposta.status}`);
      return await resposta.json();
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa === MAX_TENTATIVAS_API) break;
      const espera = Math.min(1000 * 2 ** (tentativa - 1), 8000);
      console.warn(
        `Falha temporária na API (tentativa ${tentativa}/${MAX_TENTATIVAS_API}); nova tentativa em ${espera / 1000}s.`,
      );
      await new Promise((resolve) => setTimeout(resolve, espera));
    }
  }
  throw new Error(
    `Falha após ${MAX_TENTATIVAS_API} tentativas: ${ultimoErro?.message || "erro de rede"}`,
  );
}

function normalizarNome(nome) {
  return String(nome || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

async function localizarTaxonExato(animal) {
  const nomeTaxonomico =
    NOMES_TAXONOMICOS_ATUAIS[animal.nome_cientifico] || animal.nome_cientifico;
  const parametros = new URLSearchParams({
    q: nomeTaxonomico,
    rank: "species",
    is_active: "true",
    per_page: "30",
  });
  const dados = await consultarApi(`${API}/taxa?${parametros}`);
  const nomeProcurado = normalizarNome(nomeTaxonomico);
  const correspondencias = (dados.results || []).filter(
    (taxon) =>
      taxon.rank === "species" &&
      taxon.is_active !== false &&
      normalizarNome(taxon.name) === nomeProcurado,
  );

  if (correspondencias.length !== 1) return null;
  return correspondencias[0];
}

async function buscarMelhoresImagens(animal, taxon) {
  const parametros = new URLSearchParams({
    per_page: "200",
    order_by: "votes",
    order: "desc",
    quality_grade: "research",
    photos: "true",
    captive: "false",
    photo_license: "any",
    taxon_id: String(taxon.id),
  });
  const dados = await consultarApi(`${API}/observations?${parametros}`);
  const candidatasPorUrl = new Map();

  for (const observacao of dados.results || []) {
    if (observacao.quality_grade !== "research" || observacao.captive) continue;
    if (Number(observacao.identifications_count || 0) < 2) continue;
    // taxon_id também retorna descendentes; só aceitamos correspondência exata de espécie.
    if (Number(observacao.taxon?.id) !== Number(taxon.id)) continue;
    for (const foto of observacao.photos || []) {
      const candidata = pontuarFoto(observacao, foto);
      if (candidata) {
        candidata.taxonId = taxon.id;
        candidata.taxonNome = taxon.name;
        candidata.animalId = animal.id;
        candidata.animalCientifico = animal.nome_cientifico;
        const anterior = candidatasPorUrl.get(candidata.url);
        if (!anterior || candidata.pontos > anterior.pontos) {
          candidatasPorUrl.set(candidata.url, candidata);
        }
      }
    }
  }

  const candidatas = [...candidatasPorUrl.values()];
  candidatas.sort(
    (a, b) =>
      b.pontos - a.pontos || b.largura * b.altura - a.largura * a.altura,
  );
  return candidatas.slice(0, MAX_CANDIDATAS_POR_ANIMAL);
}

function escaparHtml(valor) {
  return String(valor).replace(
    /[&<>"']/g,
    (caractere) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[caractere],
  );
}

function criarGaleria(itens, geradoEm) {
  const candidatos = [];
  const grupos = itens.filter((item) => item.imagens?.length).length;
  const blocos = itens
    .map(({ animal, imagens, erro }) => {
      if (!imagens?.length) {
        return `<article class="animal"><h2>${escaparHtml(animal.nome)} <small>${escaparHtml(animal.nome_cientifico)}</small></h2><p>${escaparHtml(erro || "Nenhuma imagem passou pelos filtros.")}</p></article>`;
      }

      const opcoes = imagens
        .map((imagem, indice) => {
          const recomendada =
            indice === 0
              ? '<strong class="recomendada">Recomendada pelo filtro</strong>'
              : "";
          const indiceCandidato = candidatos.length;
          candidatos.push({
            animalId: animal.id,
            taxonId: imagem.taxonId,
            imagem,
          });
          return `<label class="candidato">${recomendada}<img src="${escaparHtml(imagem.urlMiniatura || imagem.url)}" alt="Candidata ${indice + 1} de ${escaparHtml(animal.nome)}" loading="lazy"><p>${imagem.largura} × ${imagem.altura} px no original · ${escaparHtml(imagem.licenca)}</p><a href="${escaparHtml(imagem.observacaoUrl)}" target="_blank" rel="noreferrer">Conferir identificação e observação</a><p>${escaparHtml(imagem.credito)}</p><input required type="radio" name="animal-${animal.id}" value="${indiceCandidato}"><strong>Escolher esta foto</strong></label>`;
        })
        .join("");

      return `<section class="animal"><h2>${escaparHtml(animal.nome)} <small>${escaparHtml(animal.nome_cientifico)}</small></h2><p>Taxon confirmado: <strong>${escaparHtml(imagens[0].taxonNome)}</strong>. Escolha uma imagem para este animal.</p><div class="candidatas">${opcoes}</div></section>`;
    })
    .join("\n");
  const dadosSeguros = JSON.stringify(candidatos).replace(/</g, "\\u003c");

  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Selecionar imagens dos animais</title><style>body{font:16px system-ui,sans-serif;max-width:1200px;margin:2rem auto;padding:0 1rem 5rem;background:#f4f7f2;color:#18241c}h1{font-size:1.8rem}.animal{background:#fff;border:1px solid #d6dfd3;border-radius:12px;padding:1rem;margin:1rem 0}.animal h2{font-size:1.1rem}.animal small{display:block;color:#647064;font-weight:400}.candidatas{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.candidato{border:1px solid #d6dfd3;border-radius:9px;padding:.6rem;overflow:hidden}.candidato:has(input:checked){border:3px solid #45854e;background:#edf7ed}.candidato img{width:100%;height:220px;object-fit:contain;background:#e8ede7;border-radius:6px}.candidato p{font-size:.85rem;overflow-wrap:anywhere}.recomendada{display:block;color:#286936;margin-bottom:.5rem}.barra{position:sticky;bottom:0;background:#163c2b;color:white;padding:1rem;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:1rem}.barra button{padding:.7rem 1.1rem;border:0;border-radius:8px;font-weight:bold;cursor:pointer}</style><h1>Escolha as imagens</h1><p>Gerada em ${escaparHtml(geradoEm)}. A candidata recomendada aparece primeiro. Selecione uma foto para cada animal com opções e confira a observação original.</p><form id="formulario"><main>${blocos}</main><div class="barra"><span id="contador">0 de ${grupos} animais selecionados</span><button type="button" id="exportar">Baixar seleções</button></div></form><script>const candidatos=${dadosSeguros};const total=${grupos};const contador=document.getElementById('contador');document.addEventListener('change',()=>{const quantidade=document.querySelectorAll('input[type=radio]:checked').length;contador.textContent=quantidade+' de '+total+' animais selecionados'});document.getElementById('exportar').addEventListener('click',()=>{const selecionados=[...document.querySelectorAll('input[type=radio]:checked')].map(campo=>candidatos[Number(campo.value)]);if(selecionados.length!==total){alert('Escolha uma foto para cada animal que tem candidatas.');return}const arquivo=new Blob([JSON.stringify({geradoEm:${JSON.stringify(geradoEm)},selecionados},null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(arquivo);link.download='imagens-aprovadas.json';link.click();URL.revokeObjectURL(link.href)});</script></html>`;
}

function validarSelecao(selecao) {
  const imagem = selecao?.imagem;
  if (
    !Number.isInteger(Number(selecao?.animalId)) ||
    !Number.isInteger(Number(selecao?.taxonId))
  ) {
    throw new Error("A seleção contém um ID de animal ou espécie inválido.");
  }
  if (Number(imagem?.taxonId) !== Number(selecao.taxonId)) {
    throw new Error("A foto selecionada não corresponde ao taxon informado.");
  }
  if (!LICENCAS_PERMITIDAS.has(String(imagem?.licenca || "").toLowerCase())) {
    throw new Error("A licença da foto não é aceita pelo importador.");
  }
  const url = new URL(imagem?.url || "");
  const hostPermitido =
    url.hostname === "static.inaturalist.org" ||
    (url.hostname.startsWith("inaturalist-open-data.") &&
      url.hostname.endsWith(".amazonaws.com"));
  if (url.protocol !== "https:" || !hostPermitido) {
    throw new Error(
      "A URL da foto não é de um domínio autorizado do iNaturalist.",
    );
  }
  if (
    !/^https:\/\/www\.inaturalist\.org\/observations\/\d+$/.test(
      imagem.observacaoUrl || "",
    )
  ) {
    throw new Error("A URL da observação de origem não é válida.");
  }
  const largura = Number(imagem.largura);
  const altura = Number(imagem.altura);
  if (
    !Number.isFinite(largura) ||
    !Number.isFinite(altura) ||
    Math.min(largura, altura) < 700 ||
    Math.max(largura, altura) < 1200
  ) {
    throw new Error("A foto selecionada não atende à resolução mínima.");
  }
  if (
    !/\/original\.(jpg|jpeg|png|webp)(?:[?#]|$)/i.test(
      url.pathname + url.search + url.hash,
    )
  ) {
    throw new Error(
      "A foto selecionada não é a versão original. Gere uma nova galeria para usar a imagem em resolução completa.",
    );
  }
}

async function aplicarSelecoes(conexao, caminhoArquivo, forcar) {
  const caminho = path.resolve(caminhoArquivo);
  const conteudo = JSON.parse(await fs.readFile(caminho, "utf8"));
  const selecoes = conteudo.selecionados;
  if (!Array.isArray(selecoes) || selecoes.length === 0) {
    throw new Error(
      "O arquivo não contém fotos aprovadas. Exporte as escolhas pela galeria HTML.",
    );
  }

  let gravadas = 0;
  for (const selecao of selecoes) {
    validarSelecao(selecao);
    const [animais] = await conexao.execute(
      "SELECT id, nome, nome_cientifico, imagem FROM animais WHERE id = ?",
      [selecao.animalId],
    );
    const animal = animais[0];
    if (!animal)
      throw new Error(`Animal ID ${selecao.animalId} não existe no banco.`);
    const taxon = await localizarTaxonExato(animal);
    if (!taxon || Number(taxon.id) !== Number(selecao.taxonId)) {
      throw new Error(
        `A espécie de ${animal.nome} não corresponde à foto escolhida.`,
      );
    }
    if (animal.imagem && !forcar) {
      console.log(
        `Ignorado ${animal.nome}: já possui imagem. Use --forcar para substituir.`,
      );
      continue;
    }

    await conexao.execute(
      "UPDATE animais SET imagem = ?, imagem_fonte = ?, imagem_credito = ? WHERE id = ?",
      [
        selecao.imagem.url,
        "iNaturalist",
        `${selecao.imagem.credito} | ${selecao.imagem.licenca} | ${selecao.imagem.observacaoUrl}`,
        animal.id,
      ],
    );
    gravadas += 1;
    console.log(`Imagem escolhida gravada: ${animal.nome}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log(`Importação finalizada: ${gravadas} imagem(ns) gravada(s).`);
}

async function main() {
  const opcoes = lerArgumentos();
  const conexao = await obterConexao();
  const resultados = [];

  try {
    if (opcoes.aplicar) {
      await aplicarSelecoes(conexao, opcoes.selecoes, opcoes.forcar);
      return;
    }

    const filtros = ["nome_cientifico IS NOT NULL", "nome_cientifico <> ''"];
    const valores = [];
    if (!opcoes.forcar) filtros.push("(imagem IS NULL OR imagem = '')");
    if (opcoes.animalId !== null) {
      filtros.push("id = ?");
      valores.push(opcoes.animalId);
    }

    const [animais] = await conexao.execute(
      `SELECT id, nome, nome_cientifico, imagem FROM animais WHERE ${filtros.join(" AND ")} ORDER BY nome LIMIT ?`,
      [...valores, opcoes.limite === Infinity ? 1000000 : opcoes.limite],
    );

    if (!animais.length) {
      console.log("Nenhum animal elegível encontrado.");
      return;
    }

    console.log(`Buscando imagens para ${animais.length} animal(is).`);
    for (let indice = 0; indice < animais.length; indice += 1) {
      const animal = animais[indice];
      try {
        const taxon = await localizarTaxonExato(animal);
        if (!taxon) {
          const nomeAtual = NOMES_TAXONOMICOS_ATUAIS[animal.nome_cientifico];
          const erro = `Espécie não encontrada no iNaturalist (${animal.nome_cientifico}${nomeAtual ? `; esperado ${nomeAtual}` : ""}); imagem ignorada.`;
          resultados.push({ animal, imagens: [], erro });
          console.log(`– ${animal.nome}: ${erro}`);
          if (indice < animais.length - 1)
            await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        const imagens = await buscarMelhoresImagens(animal, taxon);
        const erro = imagens.length
          ? null
          : "Nenhuma observação exata passou pelos filtros de resolução e licença.";
        resultados.push({
          animal,
          taxon: { id: taxon.id, nome: taxon.name },
          imagens,
          erro,
        });
        console.log(
          `${imagens.length ? "✓" : "–"} ${animal.nome}: ${imagens.length} candidata(s)${erro ? ` — ${erro}` : ""}`,
        );
      } catch (erro) {
        resultados.push({ animal, imagens: [], erro: erro.message });
        console.error(`Falha em ${animal.nome}: ${erro.message}`);
      }

      if (indice < animais.length - 1)
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await fs.mkdir(PASTA_RELATORIOS, { recursive: true });
    const marcaTempo = new Date().toISOString().replace(/[:.]/g, "-");
    const dadosJson = path.join(PASTA_RELATORIOS, `imagens-${marcaTempo}.json`);
    const galeriaHtml = path.join(
      PASTA_RELATORIOS,
      `imagens-${marcaTempo}.html`,
    );
    await fs.writeFile(dadosJson, JSON.stringify(resultados, null, 2), "utf8");
    await fs.writeFile(
      galeriaHtml,
      criarGaleria(resultados, new Date().toLocaleString("pt-BR")),
      "utf8",
    );

    console.log(`\nGaleria de conferência: ${galeriaHtml}`);
    console.log(`Dados: ${dadosJson}`);
    console.log(
      "Modo de revisão: o banco não foi alterado. Abra a galeria, escolha as imagens e exporte as seleções antes de aplicar.",
    );
  } finally {
    await conexao.end();
  }
}

main().catch((erro) => {
  console.error(`Erro: ${erro.message}`);
  process.exitCode = 1;
});
