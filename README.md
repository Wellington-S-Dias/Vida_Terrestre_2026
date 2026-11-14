<p align="center">
  <img src="src/images/Arara-Azul(Logo-Principal).png" alt="Logo Vida Terrestre" width="180">
</p>

<h1 align="center">Vida Terrestre</h1>

<p align="center"><strong>Uma plataforma educativa sobre a fauna, os biomas brasileiros e a conservação da biodiversidade.</strong></p>

<p align="center">
  <a href="https://wellington-s-dias.github.io/Vida-Terrestre-2026/">Visitar a versão estática</a>
</p>

## Sobre o projeto

Vida Terrestre é um projeto acadêmico desenvolvido como Projeto Integrador do curso de Desenvolvimento Web da Faculdade Senac Criciúma. O site reúne conteúdo educativo sobre espécies da fauna brasileira, seus habitats, biomas, características e ameaças à conservação. A proposta se relaciona ao Objetivo de Desenvolvimento Sustentável 15 da ONU, sobre vida terrestre e proteção da biodiversidade.

## O que o projeto oferece

- **Página inicial** com apresentação do projeto, conteúdo visual e navegação para as demais páginas.
- **Exploração de espécies** com busca por nome, filtros por região, classe e status de conservação, navegação por bioma, detalhes sobre cada animal e quizzes educativos para parte das espécies.
- **Exploração de biomas** com conteúdo e navegação interativa pelos seis biomas brasileiros.
- **Conta de usuário** com cadastro e login por senha, Google ou GitHub, edição do perfil e coleção de cartinhas de espécies conquistadas ao concluir um quiz corretamente.
- **Catálogo e dados** guardados em MySQL, incluindo espécies, biomas e metadados de crédito e licença das imagens importadas.
- **Importador de imagens** que consulta observações do iNaturalist, prepara uma galeria para revisão humana e grava no banco somente as fotos selecionadas.

## Tecnologias

- HTML, CSS e JavaScript no navegador
- Node.js e Express no servidor
- MySQL/MariaDB para dados e sessões
- Passport para autenticação local e OAuth do Google e GitHub
- Axios para integrações HTTP e iNaturalist como fonte consultada pelo importador

## Estrutura

```text
.
├── index.html                         # Página inicial
├── explorar.html                      # Busca e exploração de espécies
├── conscientizacao.html               # Conteúdo de conscientização ambiental
├── biomas.html                        # Exploração dos biomas brasileiros
├── noticias.html                      # Notícias sobre biodiversidade
├── entrar.html                        # Cadastro e autenticação
├── conta.html                         # Perfil e personalização da conta
├── css/                               # Estilos das páginas e componentes
├── js/                                # Interações no navegador
│   └── database/migrations/           # Migrações de perfil e cartinhas de espécies
├── scripts/                           # Ferramentas de manutenção
├── server/
│   ├── servidor.js                     # Servidor Express e rotas da API
│   └── database/
│       ├── Usuarios.js                 # Cadastro e login por senha
│       ├── migrations/                 # Migrações SQL para instalações existentes
│       └── vida_terrestre.sql          # Dump de estrutura e dados iniciais
├── src/images/                        # Imagens e ícones
├── CONTRIBUTING.md                    # Orientações para contribuições
└── package.json                       # Dependências e comandos npm
```

## Executar localmente

### Requisitos

- Node.js e npm
- MySQL ou MariaDB
- Credenciais OAuth do Google e/ou GitHub, caso queira testar esses provedores

### 1. Instale as dependências

```bash
npm install
```

### 2. Prepare o banco de dados

O servidor espera um banco chamado `vida_terrestre` em `localhost`, com usuário `root` e senha vazia. Esses valores estão definidos diretamente em `server/servidor.js` e `server/database/Usuarios.js`. Ajuste os dois arquivos se sua configuração local for diferente.

O dump `server/database/vida_terrestre.sql` contém o esquema e os dados iniciais. **Ele executa `DROP DATABASE IF EXISTS vida_terrestre` antes de recriar o banco.** Importe-o somente em uma instalação descartável ou depois de fazer backup de quaisquer dados que queira manter.

Por exemplo, com o cliente MySQL disponível no terminal:

```bash
mysql -u root -p < server/database/vida_terrestre.sql
```

Se a conta local não tiver senha, remova `-p`. O comando precisa de permissão para criar e remover o banco.

O dump atual já inclui os campos `bio`, `photo` e `banner`. Para atualizar um banco antigo que ainda possui a coluna `quote`, aplique **uma única vez** a migração `js/database/migrations/001_profile_bio.sql` antes de editar perfis. Essa migração renomeia `quote` para `bio` e amplia as colunas de imagem.

Em um banco já existente, aplique **uma única vez** `server/database/migrations/002_remove_gamification.sql` para apagar as tabelas antigas de pontos, conquistas, atividade e recompensas:

```bash
mysql -u root -p vida_terrestre < server/database/migrations/002_remove_gamification.sql
```

Para criar a tabela das cartinhas em um banco existente, aplique também a migração `server/database/migrations/003_species_cards.sql`:

```bash
mysql -u root -p vida_terrestre < server/database/migrations/003_species_cards.sql
```

Para completar os dados exibidos nos modais das espécies e incluir o balança-rabo-leitoso e o joão-corta-pau em um banco existente, aplique uma vez `server/database/migrations/004_animal_modal_data.sql`:

```bash
mysql -u root -p vida_terrestre < server/database/migrations/004_animal_modal_data.sql
```

O dump `server/database/vida_terrestre.sql` já inclui essa atualização para instalações novas.

Para preencher porte, características físicas, adaptações, curiosidades e orientações de conservação nos modais, aplique uma vez `server/database/migrations/005_species_details.sql` ao banco existente:

```bash
mysql -u root -p vida_terrestre < server/database/migrations/005_species_details.sql
```

O dump `server/database/vida_terrestre.sql` também inclui esses detalhes para instalações novas.

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto. As credenciais são opcionais se você for testar apenas login por senha; configure os provedores que pretende usar:

```dotenv
SESSION_SECRET=troque-por-um-segredo-local
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Cadastre nos provedores OAuth os endereços de retorno locais:

- Google: `http://localhost:3000/auth/google/callback`
- GitHub: `http://localhost:3000/auth/github/callback`

O servidor usa esses nomes de variável para as credenciais OAuth. O importador de imagens também permite configurar `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`; seus padrões são `localhost`, `root`, vazio e `vida_terrestre`, respectivamente.

### 4. Inicie o servidor

```bash
npm start
```

Abra <http://localhost:3000>. O servidor publica os arquivos do site e atende a API na mesma origem. A tabela `vida_terrestre_sessions` é criada automaticamente após a conexão com o banco.

## Rotas principais

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/animais_completos` | Lista os registros da tabela `animais`. |
| `POST` | `/cadastro` | Cria conta com nome, e-mail e senha. |
| `POST` | `/login` | Autentica uma conta local e inicia a sessão. |
| `GET` | `/usuario` | Retorna o estado da sessão e os dados básicos da conta. |
| `GET` | `/usuario/perfil` | Lê o perfil do usuário autenticado. |
| `PUT` | `/usuario/perfil` | Atualiza nome, bio, foto e banner do usuário autenticado. |
| `GET` | `/usuario/cartas` | Lista as cartinhas de espécies salvas pelo usuário autenticado. |
| `POST` | `/quiz/iniciar` | Gera perguntas educativas para a espécie selecionada. |
| `POST` | `/quiz/concluir` | Verifica as respostas e salva a cartinha se todas estiverem corretas. |
| `GET` | `/logout` | Encerra a sessão. |
| `GET` | `/auth/google` | Inicia a autenticação Google. |
| `GET` | `/auth/github` | Inicia a autenticação GitHub. |

## Importar imagens de animais

O importador consulta a API do iNaturalist, seleciona observações de qualidade de pesquisa, verifica licença e resolução e produz uma galeria HTML com até seis candidatas por animal. A execução padrão não altera o banco; uma pessoa precisa revisar a galeria e escolher as imagens.

1. Gere a galeria:

   ```bash
   npm run importar:imagens
   ```

2. Abra o arquivo HTML gerado na pasta `relatorios-imagens/`, revise as observações e baixe `imagens-aprovadas.json`.

3. Grave as seleções no banco:

   ```powershell
   npm run importar:imagens -- --aplicar --selecoes "$env:USERPROFILE\Downloads\imagens-aprovadas.json"
   ```

Por padrão, somente animais sem imagem são incluídos. Use `--forcar` tanto ao gerar a galeria quanto ao aplicar as seleções para revisar ou substituir imagens já existentes. `--limite N` limita a quantidade de animais e `--animal ID` processa somente um registro. O script guarda fonte e crédito nos campos `imagem_fonte` e `imagem_credito`; aceita licenças Creative Commons listadas no código, exige ao menos 1200 × 700 px e tenta novamente falhas temporárias da API até quatro vezes. Consulte `node scripts/importar-imagens-animais.js --ajuda` para as opções disponíveis.

## Publicação

O link do GitHub Pages publica arquivos estáticos. As páginas que dependem do servidor — por exemplo, busca de animais via API, sessão, login e edição de perfil — precisam de uma instância Node.js e MySQL acessível; elas não passam a funcionar no Pages apenas com a publicação dos arquivos. As URLs OAuth e a estratégia de sessão no código estão configuradas para `localhost:3000`, então uma publicação com backend requer adaptar essas configurações ao domínio e HTTPS do ambiente de hospedagem.

## Contribuição

Leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de propor alterações. Não inclua `.env`, credenciais, `node_modules/` ou relatórios gerados no controle de versão.

## Equipe e contexto acadêmico

Projeto Integrador do curso de Desenvolvimento Web da Faculdade Senac Criciúma.

- Augusto Rabelo Borges
- Davi Cypriano Búrigo
- Gustavo Fontana Colombo
- Wellington Sergio Dias

Projeto desenvolvido para fins educativos e acadêmicos.
