# Guia de contribuição

Obrigado por contribuir com o **Vida Terrestre**, um projeto educativo sobre a fauna brasileira, seus biomas e a conservação da biodiversidade.

## Organização do projeto

```text
.
├── index.html                  # Página inicial
├── explorar.html               # Busca e exploração de espécies
├── biomas.html                 # Exploração dos biomas brasileiros
├── conscientizacao.html        # Conteúdo de conscientização ambiental
├── noticias.html               # Notícias sobre biodiversidade
├── entrar.html                 # Cadastro e autenticação
├── conta.html                  # Perfil e áreas da conta
├── css/                               # Estilos das páginas e componentes
├── js/                                # Interações executadas no navegador
│   └── database/migrations/           # Migrações para bancos existentes
├── scripts/                           # Ferramentas de manutenção
├── server/                            # Servidor Express e acesso ao banco
│   └── database/                      # Acesso a usuários e dump SQL
└── src/images/                        # Imagens e ícones usados pelo site
```

Mantenha cada alteração na área apropriada: páginas em HTML, estilos em `css/`, interações do navegador em `js/`, rotas e lógica do servidor em `server/`, e ferramentas auxiliares em `scripts/`. Antes de adicionar arquivos, confira se já existe um recurso adequado e se o novo arquivo será realmente referenciado.

## Preparar o ambiente

O projeto usa HTML, CSS e JavaScript no navegador, Node.js com Express no servidor e MySQL/MariaDB para dados e sessões. Para executar a aplicação localmente, instale as dependências com `npm install`, prepare o banco e inicie o servidor com `npm start`. As instruções detalhadas, incluindo configuração OAuth e importação do banco, estão no [README](README.md).

O dump SQL recria o banco `vida_terrestre`; use-o apenas numa instalação descartável ou depois de preservar os dados necessários. Não inclua credenciais OAuth nem outros segredos nas alterações.

## Boas práticas

- Preserve o idioma e os padrões de nomes já usados nas áreas que alterar.
- Mantenha a interface utilizável em telas pequenas e inclua textos alternativos apropriados para imagens informativas.
- Prefira reaproveitar estilos, componentes e imagens existentes antes de criar duplicatas.
- Para novas imagens, confirme direitos de uso e mantenha os créditos e as licenças quando aplicável.
- Não adicione dependências sem necessidade; atualize `package-lock.json` quando alterar dependências do `package.json`.
- Não envie `.env`, `node_modules/` ou relatórios gerados em `relatorios-imagens/` para o repositório.
- Se modificar uma área com comportamento visual ou interativo, verifique manualmente a página correspondente no navegador e descreva no pull request o que foi conferido.

## Pull requests

Descreva o problema ou objetivo, resuma as alterações e informe verificações realizadas. Inclua capturas de tela quando a mudança alterar a interface. Mantenha cada pull request focado num conjunto relacionado de alterações.
