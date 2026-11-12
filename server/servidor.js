require("dotenv").config();

const path = require("path");

const mysql = require("mysql2");
const Usuarios = require("./database/Usuarios");

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;

const axios = require("axios");
const crypto = require("crypto");

const multer = require("multer");
const fs = require("fs");

const app = express();

// ============================================================
// EMAIL DO ADM
// ============================================================

const emailAdmin = "vida_terrestre@gmail.com";

// ============================================================
// CONFIGURAÇÕES
// ============================================================

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));

app.get("/biomas", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "biomas.html"));
});

// ============================================================
// NOTÍCIAS AMBIENTAIS
// ============================================================

const newsFeeds = [
  {
    category: "conservacao",
    label: "Conservação",
    query: "conservação natureza Brasil",
    image: "/src/images/news/concervation-news.jpg",
  },
  {
    category: "especies",
    label: "Espécies",
    query: "fauna espécies ameaçadas Brasil",
    image: "/src/images/news/especies-news.jpg",
  },
  {
    category: "biomas",
    label: "Biomas",
    query: "biomas brasileiros meio ambiente",
    image: "/src/images/news/biomas-news.jpg",
  },
  {
    category: "ciencia",
    label: "Ciência",
    query: "ciência biodiversidade Brasil",
    image: "/src/images/news/cience-news.jpg",
  },
];
let newsCache = { expires: 0, articles: [], stats: null };

function xmlValue(block, tag) {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return match
    ? match[1]
        .replace(/^<!\[CDATA\[/, "")
        .replace(/\]\]>$/, "")
        .trim()
    : "";
}

function cleanNewsText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNewsFeed(xml, feed) {
  return (xml.match(/<item[\s\S]*?<\/item>/gi) || [])
    .map((item) => {
      const date = new Date(xmlValue(item, "pubDate"));
      return {
        category: feed.category,
        categoryLabel: feed.label,
        title: cleanNewsText(xmlValue(item, "title")),
        summary:
          cleanNewsText(xmlValue(item, "description")) ||
          "Confira os detalhes e as informações mais recentes sobre a vida terrestre.",
        source:
          cleanNewsText(xmlValue(item, "source")) || "Notícias ambientais",
        link: xmlValue(item, "link") || "https://news.google.com/",
        image: feed.image,
        date: Number.isNaN(date.getTime())
          ? "Hoje"
          : date.toLocaleDateString("pt-BR"),
        timestamp: Number.isNaN(date.getTime()) ? 0 : date.getTime(),
      };
    })
    .filter((article) => article.title);
}

async function persistNews(articles) {
  const connection = db.promise();
  await connection.query(`CREATE TABLE IF NOT EXISTS noticias (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    external_key CHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    source VARCHAR(180),
    link VARCHAR(1000) NOT NULL,
    image VARCHAR(500),
    published_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_noticias_external_key (external_key),
    KEY idx_noticias_category_date (category, published_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await Promise.all(
    articles.map((article) => {
      const key = crypto
        .createHash("sha256")
        .update(`${article.title}|${article.link}`)
        .digest("hex");
      const published = article.timestamp ? new Date(article.timestamp) : null;
      return connection.execute(
        `INSERT INTO noticias (external_key, category, title, summary, source, link, image, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE summary=VALUES(summary), source=VALUES(source), image=VALUES(image), published_at=VALUES(published_at)`,
        [
          key,
          article.category,
          article.title,
          article.summary,
          article.source,
          article.link,
          article.image,
          published,
        ],
      );
    }),
  );
}

async function getNewsStats(articles) {
  const fallback = {
    total: articles.length,
    categories: Object.fromEntries(
      newsFeeds.map((feed) => [
        feed.category,
        articles.filter((article) => article.category === feed.category).length,
      ]),
    ),
  };
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT category, COUNT(*) AS total FROM noticias WHERE published_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY category",
      );
    const categories = { ...fallback.categories };
    rows.forEach((row) => {
      categories[row.category] = Number(row.total);
    });
    return {
      total: Object.values(categories).reduce((sum, value) => sum + value, 0),
      categories,
    };
  } catch {
    return fallback;
  }
}

app.get("/api/noticias", async (req, res) => {
  if (newsCache.expires > Date.now() && newsCache.articles.length)
    return res.json({
      articles: newsCache.articles,
      stats: newsCache.stats,
      cached: true,
    });
  try {
    const responses = await Promise.allSettled(
      newsFeeds.map((feed) =>
        axios.get("https://news.google.com/rss/search", {
          params: { q: feed.query, hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" },
          timeout: 8000,
          responseType: "text",
        }),
      ),
    );
    const articles = responses.flatMap((result, index) =>
      result.status === "fulfilled"
        ? parseNewsFeed(result.value.data, newsFeeds[index]).slice(0, 4)
        : [],
    );
    const unique = [
      ...new Map(
        articles.map((article) => [article.title.toLowerCase(), article]),
      ).values(),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12);
    if (!unique.length) throw new Error("Nenhuma notícia disponível");
    try {
      await persistNews(unique);
    } catch (databaseError) {
      console.error(
        "Não foi possível salvar o histórico de notícias:",
        databaseError.message,
      );
    }
    const stats = await getNewsStats(unique);
    newsCache = {
      expires: Date.now() + 5 * 60 * 1000,
      articles: unique,
      stats,
    };
    res.json({ articles: unique, stats, cached: false });
  } catch (error) {
    console.error("Erro ao buscar notícias ambientais:", error.message);
    const today = new Date().toLocaleDateString("pt-BR");
    const fallback = newsFeeds.map((feed, index) => ({
      category: feed.category,
      categoryLabel: feed.label,
      title: [
        "Novas ações fortalecem a conservação da natureza no Brasil",
        "Pesquisadores acompanham espécies brasileiras em risco",
        "Biomas brasileiros ganham atenção em novos projetos",
        "Ciência amplia o conhecimento sobre a biodiversidade",
      ][index],
      summary:
        "Acompanhe informações verificadas e iniciativas que ajudam a proteger a biodiversidade brasileira.",
      source: "Vida Terrestre",
      link: "https://www.gov.br/mma/pt-br",
      image: feed.image,
      date: today,
      timestamp: Date.now(),
    }));
    const stats = await getNewsStats(fallback);
    res.json({ articles: fallback, stats, cached: false, fallback: true });
  }
});

// ============================================================
// CONFIGURAÇÃO DE UPLOAD DE IMAGENS DOS ANIMAIS
// ============================================================

const pastaImagens = path.join(__dirname, "..", "uploads", "animais");

fs.mkdirSync(pastaImagens, { recursive: true });

const armazenamentoAnimais = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, pastaImagens);
  },

  filename: (req, file, callback) => {
    const extensoes = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    const extensao = extensoes[file.mimetype];

    if (!extensao) {
      return callback(new Error("Formato de imagem não permitido."));
    }

    const nomeArquivo = crypto.randomBytes(16).toString("hex") + extensao;

    callback(null, nomeArquivo);
  },
});

const uploadAnimal = multer({
  storage: armazenamentoAnimais,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const formatosPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!formatosPermitidos.includes(file.mimetype)) {
      return callback(new Error("Envie uma imagem JPG, PNG ou WEBP."));
    }

    callback(null, true);
  },
});

// ============================================================
// MYSQL
// ============================================================

const db = mysql.createConnection({
  host: "localhost",

  user: "root",

  password: "",

  database: "vida_terrestre",
});

class MySQLSessionStore extends session.Store {
  constructor(connection) {
    super();
    this.connection = connection;
  }

  get(sessionId, callback) {
    this.connection.query(
      "SELECT data FROM vida_terrestre_sessions WHERE session_id = ? AND expires > ? LIMIT 1",
      [sessionId, Math.floor(Date.now() / 1000)],
      (error, rows) => {
        if (error) return callback(error);
        if (!rows.length) return callback(null, null);
        try {
          callback(null, JSON.parse(rows[0].data));
        } catch (parseError) {
          callback(parseError);
        }
      },
    );
  }

  set(sessionId, sessionData, callback = () => {}) {
    const expiresAt = this.getExpiration(sessionData);
    this.connection.query(
      `INSERT INTO vida_terrestre_sessions (session_id, expires, data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
      [sessionId, expiresAt, JSON.stringify(sessionData)],
      callback,
    );
  }

  touch(sessionId, sessionData, callback = () => {}) {
    this.connection.query(
      "UPDATE vida_terrestre_sessions SET expires = ? WHERE session_id = ?",
      [this.getExpiration(sessionData), sessionId],
      callback,
    );
  }

  destroy(sessionId, callback = () => {}) {
    this.connection.query(
      "DELETE FROM vida_terrestre_sessions WHERE session_id = ?",
      [sessionId],
      callback,
    );
  }

  getExpiration(sessionData) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + (sessionData.cookie?.maxAge || 24 * 60 * 60 * 1000);
    return Math.floor(expires / 1000);
  }
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "vida-terrestre-secret",
    store: new MySQLSessionStore(db),
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

db.connect((erro) => {
  if (erro) {
    console.error("Erro ao conectar ao MySQL:", erro);

    return;
  }

  db.query(
    `CREATE TABLE IF NOT EXISTS vida_terrestre_sessions (
      session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
      expires INT UNSIGNED NOT NULL,
      data MEDIUMTEXT,
      PRIMARY KEY (session_id),
      INDEX vida_terrestre_sessions_expires_idx (expires)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
    (tableError) => {
      if (tableError) {
        console.error("Erro ao preparar as sessões no MySQL:", tableError);
        return;
      }

      console.log("MySQL conectado e sessões persistentes preparadas.");
      const cleanupTimer = setInterval(
        () => {
          db.query("DELETE FROM vida_terrestre_sessions WHERE expires <= ?", [
            Math.floor(Date.now() / 1000),
          ]);
        },
        15 * 60 * 1000,
      );
      cleanupTimer.unref();
      app.listen(3000, () =>
        console.log("Servidor rodando em http://localhost:3000"),
      );
    },
  );
});

// ============================================================
// GET ANIMAIS
// ============================================================

app.get("/animais_completos", (req, res) => {
  db.query("SELECT * FROM animais", (erro, resultados) => {
    if (erro) {
      console.error("Erro ao buscar animais:", erro);

      return res.status(500).json({
        erro: "Erro ao buscar animais",
      });
    }

    res.json(resultados);
  });
});

// ============================================================
// CADASTRO
// ============================================================

app.post("/cadastro", (req, res) => {
  const usuario = req.body;

  Usuarios.addUsuario(usuario, (message) => {
    res.status(201).json(message);
  });
});

// ============================================================
// LOGIN NORMAL
// ============================================================

app.post("/login", (req, res) => {
  const usuario = req.body;

  Usuarios.login(usuario, (message) => {
    if (message.error) return res.status(401).json(message);

    req.login(message.usuario, (error) => {
      if (error) {
        return res
          .status(500)
          .json({ error: "Não foi possível iniciar a sessão." });
      }
      res.json(message);
    });
  });
});

// ============================================================
// VERIFICA ADM
// ============================================================
function exigirAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      erro: "Você precisa estar logado.",
    });
  }

  const admin = req.user.email?.toLowerCase() === emailAdmin.toLowerCase();

  if (!admin) {
    return res.status(403).json({
      erro: "Você não tem permissão para realizar esta ação.",
    });
  }

  next();
}

app.get("/verificar-admin", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      autenticado: false,
    });
  }

  const admin = req.user.email?.toLowerCase() === emailAdmin.toLowerCase();

  res.json({
    autenticado: true,
    admin: admin,
  });
});

// ============================================================
// Adicionar Animais
// ============================================================

app.post(
  "/adicionar-animal",
  exigirAdmin,
  uploadAnimal.single("arquivo_imagem"),
  async (req, res) => {
    try {
      const dados = req.body;

      const nome = String(dados.nome || "").trim();
      const nomeCientifico = String(dados.nome_cientifico || "").trim();
      const status = String(dados.status || "").trim();

      const classesStatus = {
        "Pouco Preocupante": "pouco-preocupante",
        "Quase ameaçada": "quase-ameacada",
        Vulnerável: "vulneravel",
        "Em Perigo": "em-perigo",
        "Criticamente em perigo": "critico",
      };

      if (!nome || !nomeCientifico || !status) {
        return res.status(400).json({
          erro: "Preencha os campos obrigatórios.",
        });
      }

      if (!classesStatus[status]) {
        return res.status(400).json({
          erro: "Status de conservação inválido.",
        });
      }

      const biomas = Array.isArray(dados.bioma)
        ? dados.bioma.join(",")
        : dados.bioma || "";

      const regioes = Array.isArray(dados.regiao)
        ? dados.regiao.join(",")
        : dados.regiao || "";

      const imagem = req.file
        ? `/uploads/animais/${req.file.filename}`
        : String(dados.imagem || "").trim();

      const valores = [
        nome,
        nomeCientifico,
        status,
        classesStatus[status],
        dados.tipo || null,
        regioes || null,
        biomas,
        imagem || null,
        dados.habitat || null,
        dados.comportamento || null,
        dados.curiosidade || null,
        dados.alimentacao || null,
        dados.ameacas || null,
        dados.taxon_id || null,
        dados.imagem_fonte || null,
        dados.imagem_credito || null,
        dados.porte || null,
        dados.caracteristicas_fisicas || null,
        dados.adaptacao || null,
        dados.dieta_tipo || null,
        dados.orientacao_conservacao || null,
      ];

      const sql = `
        INSERT INTO animais (
          nome, nome_cientifico, status, status_class,
          tipo, regiao, bioma, imagem, habitat,
          comportamento, curiosidade, alimentacao, ameacas,
          taxon_id, imagem_fonte, imagem_credito, porte,
          caracteristicas_fisicas, adaptacao, dieta_tipo,
          orientacao_conservacao
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [resultado] = await db.promise().execute(sql, valores);

      res.status(201).json({
        mensagem: "Animal cadastrado com sucesso!",
        id: resultado.insertId,
      });
    } catch (erro) {
      console.error("Erro ao cadastrar animal:", erro);

      res.status(500).json({
        erro: "Não foi possível cadastrar o animal.",
      });
    }
  },
);

// ============================================================
// DELETAR ANIMAL
// ============================================================

app.delete("/animais/:id", exigirAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Verifica se o ID é válido
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        erro: "ID do animal inválido.",
      });
    }

    // Busca a imagem antes de excluir o registro
    const [[animal]] = await db
      .promise()
      .execute("SELECT imagem FROM animais WHERE id = ?", [id]);

    if (!animal) {
      return res.status(404).json({
        erro: "Animal não encontrado.",
      });
    }

    // Exclui o animal do banco
    await db.promise().execute("DELETE FROM animais WHERE id = ?", [id]);

    // Se a imagem estiver na pasta de uploads, remove o arquivo
    if (animal.imagem?.startsWith("/uploads/animais/")) {
      const nomeArquivo = path.basename(animal.imagem);
      const caminhoImagem = path.join(pastaImagens, nomeArquivo);

      try {
        await fs.promises.unlink(caminhoImagem);
      } catch (erroImagem) {
        console.error("Não foi possível remover a imagem:", erroImagem);
      }
    }

    res.json({
      mensagem: "Animal excluído com sucesso!",
    });
  } catch (erro) {
    console.error("Erro ao excluir animal:", erro);

    res.status(500).json({
      erro: "Não foi possível excluir o animal.",
    });
  }
});

// ============================================================
// EDITAR ANIMAL
// ============================================================

app.put(
  "/animais/:id",
  exigirAdmin,
  uploadAnimal.single("arquivo_imagem"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const dados = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          erro: "ID do animal inválido.",
        });
      }

      const nome = String(dados.nome || "").trim();
      const nomeCientifico = String(dados.nome_cientifico || "").trim();
      const status = String(dados.status || "").trim();

      const classesStatus = {
        "Pouco Preocupante": "pouco-preocupante",
        "Quase ameaçada": "quase-ameacada",
        Vulnerável: "vulneravel",
        "Em Perigo": "em-perigo",
        "Criticamente em perigo": "critico",
      };

      if (!nome || !nomeCientifico || !status) {
        return res.status(400).json({
          erro: "Preencha os campos obrigatórios.",
        });
      }

      if (!classesStatus[status]) {
        return res.status(400).json({
          erro: "Status de conservação inválido.",
        });
      }

      // Verifica se o animal existe
      const [animaisEncontrados] = await db
        .promise()
        .execute("SELECT id FROM animais WHERE id = ?", [id]);

      if (animaisEncontrados.length === 0) {
        return res.status(404).json({
          erro: "Animal não encontrado.",
        });
      }

      const biomas = Array.isArray(dados.bioma)
        ? dados.bioma.join(",")
        : dados.bioma || "";

      const regioes = Array.isArray(dados.regiao)
        ? dados.regiao.join(",")
        : dados.regiao || "";

      const imagem = req.file
        ? `/uploads/animais/${req.file.filename}`
        : String(dados.imagem || "").trim();

      const valores = [
        nome,
        nomeCientifico,
        status,
        classesStatus[status],
        dados.tipo || null,
        regioes || null,
        biomas,
        imagem || null,
        dados.habitat || null,
        dados.comportamento || null,
        dados.curiosidade || null,
        dados.alimentacao || null,
        dados.ameacas || null,
        dados.taxon_id || null,
        dados.imagem_fonte || null,
        dados.imagem_credito || null,
        dados.porte || null,
        dados.caracteristicas_fisicas || null,
        dados.adaptacao || null,
        dados.dieta_tipo || null,
        dados.orientacao_conservacao || null,
        id,
      ];

      const sql = `
        UPDATE animais SET
          nome = ?,
          nome_cientifico = ?,
          status = ?,
          status_class = ?,
          tipo = ?,
          regiao = ?,
          bioma = ?,
          imagem = ?,
          habitat = ?,
          comportamento = ?,
          curiosidade = ?,
          alimentacao = ?,
          ameacas = ?,
          taxon_id = ?,
          imagem_fonte = ?,
          imagem_credito = ?,
          porte = ?,
          caracteristicas_fisicas = ?,
          adaptacao = ?,
          dieta_tipo = ?,
          orientacao_conservacao = ?
        WHERE id = ?
      `;

      await db.promise().execute(sql, valores);

      res.json({
        mensagem: "Animal atualizado com sucesso!",
      });
    } catch (erro) {
      console.error("Erro ao editar animal:", erro);

      res.status(500).json({
        erro: "Não foi possível atualizar o animal.",
      });
    }
  },
);

// ============================================================
// USUÁRIO LOGADO
// ============================================================

app.get("/usuario", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      logado: false,
    });
  }

  if (!req.user?.email) {
    return res.json({
      logado: true,
      usuario: { name: req.user?.name || "", email: "", photo: "", bio: "" },
    });
  }

  db.query(
    "SELECT name, email, photo, banner, bio FROM usuario WHERE email = ? LIMIT 1",
    [req.user.email],
    (erro, resultados) => {
      if (erro) {
        console.error("Erro ao buscar dados do usuário:", erro);
        return res
          .status(500)
          .json({ erro: "Não foi possível carregar a conta." });
      }
      const usuario = resultados[0] || req.user;
      res.json({
        logado: true,
        usuario: {
          name: usuario.name || "",
          email: usuario.email || "",
          photo: usuario.photo || "",
          banner: usuario.banner || "",
          bio: usuario.bio || "",
        },
      });
    },
  );
});

// ============================================================
// PERFIL DO USUÁRIO
// ============================================================

function validarImagemPerfil(valor) {
  if (valor === "") return true;
  if (typeof valor !== "string" || valor.length > 8_000_000) return false;
  if (
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(valor)
  ) {
    return true;
  }
  try {
    return new URL(valor).protocol === "https:";
  } catch {
    return false;
  }
}

app.get("/usuario/perfil", (req, res) => {
  if (!req.isAuthenticated() || !req.user?.email) {
    return res
      .status(401)
      .json({ erro: "Entre na sua conta para ver o perfil." });
  }

  db.query(
    "SELECT name, email, banner, photo, bio FROM usuario WHERE email = ? LIMIT 1",
    [req.user.email],
    (erro, resultados) => {
      if (erro) {
        console.error("Erro ao buscar perfil:", erro);
        return res
          .status(500)
          .json({ erro: "Não foi possível carregar o perfil." });
      }
      if (!resultados.length) {
        return res.status(404).json({ erro: "A conta não foi encontrada." });
      }
      res.json({ perfil: resultados[0] });
    },
  );
});

function usuarioId(req) {
  return Number(req.user?.id || req.user?.usuarioId || 0);
}
function exigirConta(req, res) {
  if (!req.isAuthenticated() || !usuarioId(req)) {
    res
      .status(401)
      .json({ erro: "Entre na sua conta para participar do quiz." });
    return false;
  }
  return true;
}
function animalTemQuiz(id) {
  return Number(id) % 2 === 0 || Number(id) % 5 === 0;
}

app.get("/usuario/cartas", (req, res) => {
  if (!exigirConta(req, res)) return;
  db.query(
    "SELECT a.id,a.nome,a.nome_cientifico,a.imagem FROM user_cards c JOIN animais a ON a.id=c.animal_id WHERE c.user_id=? ORDER BY a.nome",
    [usuarioId(req)],
    (error, cards) => {
      if (error) {
        console.error("Erro ao buscar cartinhas:", error);
        return res
          .status(500)
          .json({ erro: "Não foi possível carregar suas cartinhas." });
      }
      res.json({ cards });
    },
  );
});

app.post("/quiz/iniciar", async (req, res) => {
  if (!exigirConta(req, res)) return;
  const id = Number(req.body?.animalId);
  if (!Number.isInteger(id) || !animalTemQuiz(id)) {
    return res
      .status(400)
      .json({ erro: "Esta espécie não tem quiz disponível." });
  }

  try {
    const connection = db.promise();
    const [[animal]] = await connection.query(
      "SELECT id,nome,nome_cientifico,tipo,status,bioma,habitat,alimentacao,dieta_tipo,comportamento,ameacas FROM animais WHERE id=? LIMIT 1",
      [id],
    );
    if (!animal)
      return res.status(404).json({ erro: "Espécie não encontrada." });

    const [catalogo] = await connection.query(
      "SELECT nome_cientifico,tipo,status,bioma,habitat,alimentacao,dieta_tipo,comportamento,ameacas FROM animais WHERE id<>?",
      [id],
    );
    const embaralhar = (items) => {
      const shuffled = [...new Set(items.filter(Boolean))];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [
          shuffled[swapIndex],
          shuffled[index],
        ];
      }
      return shuffled;
    };
    const criarQuestao = (topic, question, field, answer, explanation) => {
      const resposta = String(answer || "").trim();
      if (!resposta) return null;
      const alternatives = catalogo
        .map((item) => String(item[field] || "").trim())
        .filter((option) => option && option !== resposta);
      const wrongAnswers = embaralhar(alternatives).slice(0, 3);
      if (!wrongAnswers.length) return null;
      const options = embaralhar([resposta, ...wrongAnswers]);
      return {
        topic,
        question,
        options,
        answer: options.indexOf(resposta),
        explanation,
      };
    };
    const questions = [
      criarQuestao(
        "Classificação",
        `A qual grupo pertence ${animal.nome}?`,
        "tipo",
        animal.tipo,
        `${animal.nome} é classificado como ${animal.tipo}.`,
      ),
      criarQuestao(
        "Nome científico",
        `Qual é o nome científico de ${animal.nome}?`,
        "nome_cientifico",
        animal.nome_cientifico,
        `O nome científico registrado para ${animal.nome} é ${animal.nome_cientifico}.`,
      ),
      criarQuestao(
        "Conservação",
        `Qual é o status de conservação de ${animal.nome}?`,
        "status",
        animal.status,
        `O status de conservação informado para ${animal.nome} é ${animal.status}.`,
      ),
      criarQuestao(
        "Distribuição",
        `Em quais biomas ${animal.nome} ocorre?`,
        "bioma",
        animal.bioma,
        `${animal.nome} ocorre em: ${animal.bioma}.`,
      ),
      criarQuestao(
        "Habitat",
        `Que tipo de habitat é associado a ${animal.nome}?`,
        "habitat",
        animal.habitat,
        `O habitat registrado para ${animal.nome} é: ${animal.habitat}.`,
      ),
      criarQuestao(
        "Alimentação",
        `Qual é a alimentação registrada para ${animal.nome}?`,
        "alimentacao",
        animal.alimentacao,
        `A alimentação descrita para ${animal.nome} é: ${animal.alimentacao}.`,
      ),
      criarQuestao(
        "Comportamento",
        `Qual comportamento é característico de ${animal.nome}?`,
        "comportamento",
        animal.comportamento,
        `O comportamento descrito para ${animal.nome} é: ${animal.comportamento}.`,
      ),
      criarQuestao(
        "Ameaças",
        `Qual ameaça afeta ${animal.nome}?`,
        "ameacas",
        animal.ameacas,
        `Entre as ameaças registradas para ${animal.nome} estão: ${animal.ameacas}.`,
      ),
    ]
      .filter(Boolean)
      .slice(0, 6);

    if (questions.length < 3) {
      return res
        .status(422)
        .json({
          erro: "Ainda não há informações suficientes para montar um quiz desta espécie.",
        });
    }

    req.session.animalQuiz = { animalId: id, questions };
    res.json({
      questions: questions.map(({ topic, question, options }) => ({
        topic,
        question,
        options,
      })),
    });
  } catch (error) {
    console.error("Erro ao iniciar quiz:", error);
    res
      .status(500)
      .json({ erro: "Não foi possível carregar o quiz desta espécie." });
  }
});
app.post("/quiz/concluir", async (req, res) => {
  if (!exigirConta(req, res)) return;
  const quiz = req.session.animalQuiz;
  if (!quiz || !Array.isArray(req.body?.answers)) {
    return res.status(400).json({ erro: "Quiz expirado. Comece novamente." });
  }
  if (req.body.answers.length !== quiz.questions.length) {
    return res
      .status(400)
      .json({ erro: "Responda todas as questões antes de concluir." });
  }

  const review = quiz.questions.map((question, index) => {
    const selectedIndex = Number(req.body.answers[index]);
    return {
      topic: question.topic,
      question: question.question,
      correct: selectedIndex === question.answer,
      selectedAnswer:
        question.options[selectedIndex] || "Nenhuma resposta selecionada",
      correctAnswer: question.options[question.answer],
      explanation: question.explanation,
    };
  });
  const correct = review.every((item) => item.correct);
  let card = null;
  let cardAdded = false;
  if (correct) {
    try {
      const connection = db.promise();
      const [insertResult] = await connection.query(
        "INSERT IGNORE INTO user_cards (user_id,animal_id) VALUES (?,?)",
        [usuarioId(req), quiz.animalId],
      );
      cardAdded = insertResult.affectedRows > 0;
      const [[savedCard]] = await connection.query(
        "SELECT a.id,a.nome,a.nome_cientifico,a.imagem FROM user_cards c JOIN animais a ON a.id=c.animal_id WHERE c.user_id=? AND c.animal_id=? LIMIT 1",
        [usuarioId(req), quiz.animalId],
      );
      card = savedCard || null;
    } catch (error) {
      console.error("Erro ao salvar cartinha:", error);
      return res
        .status(500)
        .json({
          erro: "Quiz concluído, mas não foi possível salvar a cartinha. Tente novamente.",
        });
    }
  }
  delete req.session.animalQuiz;
  res.json({
    correct,
    cardAdded,
    card,
    message: correct
      ? cardAdded
        ? "Todas as respostas estão corretas. A cartinha desta espécie foi salva no seu perfil."
        : "Todas as respostas estão corretas. Esta cartinha já estava salva no seu perfil."
      : "Confira as respostas e explicações abaixo; depois, você pode tentar novamente.",
    review,
  });
});

app.put("/usuario/perfil", (req, res) => {
  if (!req.isAuthenticated() || !req.user?.email) {
    return res
      .status(401)
      .json({ erro: "Entre na sua conta para salvar o perfil." });
  }

  const name = String(req.body?.name || "").trim();
  const bio = String(req.body?.bio || "").trim();
  const photo = req.body?.photo;
  const banner = req.body?.banner;
  if (!name || name.length > 50) {
    return res
      .status(400)
      .json({ erro: "O nome deve ter entre 1 e 50 caracteres." });
  }
  if (bio.length > 500) {
    return res
      .status(400)
      .json({ erro: "A bio pode ter no máximo 500 caracteres." });
  }
  if (!validarImagemPerfil(photo) || !validarImagemPerfil(banner)) {
    return res
      .status(400)
      .json({ erro: "Envie uma imagem válida ou um endereço HTTPS." });
  }

  db.query(
    "UPDATE usuario SET name = ?, bio = ?, photo = ?, banner = ? WHERE email = ?",
    [name, bio, photo || "", banner || "", req.user.email],
    (erro) => {
      if (erro) {
        console.error("Erro ao salvar perfil:", erro);
        return res
          .status(500)
          .json({
            erro: "Não foi possível salvar. Confira se a migração do perfil foi aplicada.",
          });
      }
      Object.assign(req.user, {
        name,
        bio,
        photo: photo || "",
        banner: banner || "",
      });
      res.json({
        mensagem: "Perfil atualizado.",
        perfil: {
          name,
          email: req.user.email,
          bio,
          photo: photo || "",
          banner: banner || "",
        },
      });
    },
  );
});

// ============================================================
// LOGOUT
// ============================================================

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        erro: "Erro ao sair",
      });
    }

    res.redirect("/entrar.html?logout=1");
  });
});

// ============================================================
// GOOGLE LOGIN
// ============================================================

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,

      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const googleId = profile.id;
      const name = profile.displayName;
      const email = profile.emails?.[0]?.value;

      console.log("Usuário recebido do Google:");
      console.log({
        googleId,
        name,
        email,
      });

      // ========================================================
      // 1. PROCURAR PELO GOOGLE ID
      // ========================================================

      db.query(
        "SELECT * FROM usuario WHERE google_id = ?",
        [googleId],

        (erro, resultados) => {
          if (erro) {
            console.error("Erro ao procurar Google ID:", erro);

            return done(erro);
          }

          // ====================================================
          // USUÁRIO JÁ EXISTE
          // ====================================================

          if (resultados.length > 0) {
            console.log("Usuário Google já existe.");

            return done(null, resultados[0]);
          }

          // ====================================================
          // 2. PROCURAR PELO EMAIL
          // ====================================================

          db.query(
            "SELECT * FROM usuario WHERE email = ?",
            [email],

            (erro, resultados) => {
              if (erro) {
                console.error("Erro ao procurar e-mail:", erro);

                return done(erro);
              }

              // ==============================================
              // EMAIL JÁ EXISTE
              // ==============================================

              if (resultados.length > 0) {
                const usuario = resultados[0];

                console.log("E-mail já cadastrado. Vinculando Google...");

                db.query(
                  "UPDATE usuario SET google_id = ? WHERE id = ?",

                  [googleId, usuario.id],

                  (erro) => {
                    if (erro) {
                      console.error("Erro ao vincular Google:", erro);

                      return done(erro);
                    }

                    usuario.google_id = googleId;

                    console.log("Google vinculado à conta existente!");

                    return done(null, usuario);
                  },
                );

                return;
              }

              // ====================================================
              // 3. USUÁRIO NOVO
              // ====================================================

              const novoUsuario = {
                name: name,

                email: email,

                password: null,

                google_id: googleId,
              };

              db.query(
                "INSERT INTO usuario SET ?",

                novoUsuario,

                (erro, resultado) => {
                  if (erro) {
                    console.error("Erro ao criar usuário Google:", erro);

                    return done(erro);
                  }

                  novoUsuario.id = resultado.insertId;

                  console.log("Novo usuário Google criado!");

                  console.log(novoUsuario);

                  return done(null, novoUsuario);
                },
              );
            },
          );
        },
      );
    },
  ),
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,

      clientSecret: process.env.GITHUB_CLIENT_SECRET,

      callbackURL: "http://localhost:3000/auth/github/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const githubId = profile.id;

        const name = profile.displayName || profile.username;

        // ========================================================
        // BUSCAR E-MAILS DO GITHUB
        // ========================================================

        const response = await axios.get("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
          },
        });
        const emails = response.data;
        // Procurar o e-mail principal
        const emailPrincipal = emails.find(
          (email) => email.primary && email.verified,
        );

        if (!emailPrincipal) {
          return done(
            new Error(
              "Não foi encontrado um e-mail verificado na conta do GitHub.",
            ),
          );
        }

        const email = emailPrincipal.email;

        console.log("Usuário recebido do GitHub:");

        console.log({
          githubId,
          name,
          email,
        });

        // ========================================================
        // PROCURAR PELO GITHUB ID
        // ========================================================

        db.query(
          "SELECT * FROM usuario WHERE github_id = ?",
          [githubId],

          (erro, resultados) => {
            if (erro) {
              console.error("Erro ao procurar GitHub ID:", erro);

              return done(erro);
            }

            // ==================================================
            // USUÁRIO JÁ EXISTE
            // ==================================================

            if (resultados.length > 0) {
              console.log("Usuário GitHub já existe.");

              return done(null, resultados[0]);
            }

            // ==================================================
            // PROCURAR PELO EMAIL
            // ==================================================

            db.query(
              "SELECT * FROM usuario WHERE email = ?",
              [email],

              (erro, resultados) => {
                if (erro) {
                  console.error("Erro ao procurar e-mail:", erro);

                  return done(erro);
                }

                // ==========================================
                // EMAIL JÁ EXISTE
                // ==========================================

                if (resultados.length > 0) {
                  const usuario = resultados[0];

                  db.query(
                    "UPDATE usuario SET github_id = ? WHERE id = ?",

                    [githubId, usuario.id],

                    (erro) => {
                      if (erro) {
                        console.error("Erro ao vincular GitHub:", erro);

                        return done(erro);
                      }

                      usuario.github_id = githubId;

                      console.log("GitHub vinculado à conta existente!");

                      return done(null, usuario);
                    },
                  );

                  return;
                }

                // ==========================================
                // CRIAR NOVO USUÁRIO
                // ==========================================

                const novoUsuario = {
                  name: name,

                  email: email,

                  password: null,

                  google_id: null,

                  github_id: githubId,
                };

                db.query(
                  "INSERT INTO usuario SET ?",

                  novoUsuario,

                  (erro, resultado) => {
                    if (erro) {
                      console.error("Erro ao criar usuário GitHub:", erro);

                      return done(erro);
                    }

                    novoUsuario.id = resultado.insertId;

                    console.log("Novo usuário GitHub criado:", novoUsuario);

                    return done(null, novoUsuario);
                  },
                );
              },
            );
          },
        );
      } catch (erro) {
        console.error(
          "Erro ao consultar API do GitHub:",
          erro.response?.data || erro.message,
        );

        return done(erro);
      }
    },
  ),
);

// ============================================================
// SERIALIZAÇÃO DA SESSÃO
// ============================================================

passport.serializeUser((user, done) => {
  done(null, {
    id: user.id,
    email: user.email,
    name: user.name,
    photo: user.photo,
    bio: user.bio,
  });
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// ============================================================
// ROTAS DO GOOGLE
// ============================================================

app.get(
  "/auth/google",

  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

app.get(
  "/auth/google/callback",

  passport.authenticate("google", {
    failureRedirect: "/entrar.html",
  }),

  (req, res) => {
    console.log("Login Google realizado!");

    res.redirect("/");
  },
);

app.get(
  "/auth/github",

  passport.authenticate("github", {
    scope: ["user:email"],
  }),
);

app.get(
  "/auth/github/callback",

  passport.authenticate("github", {
    failureRedirect: "/entrar.html",
  }),

  (req, res) => {
    console.log("Login GitHub realizado!");

    res.redirect("/");
  },
);
// ============================================================
// ARQUIVOS DO SITE
// ============================================================

// Se seus HTML/CSS/JS estão em uma pasta pública,
// coloque o nome dela aqui.
//
// Exemplo:
// app.use(express.static('public'));
