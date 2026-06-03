# Fichário Digital Inteligente

Um fichário escolar digital feito com HTML, CSS e JavaScript puro. O app roda direto no navegador, salva tudo em `localStorage` e pode ser publicado facilmente no GitHub Pages.

## Funcionalidades

- Dashboard com matérias em cards personalizáveis.
- Organização por matérias, conteúdos, tags, favoritos e prioridade.
- Editor de anotações com estilo parecido com Word.
- Busca global em tempo real por matérias, conteúdos e anotações.
- Temas: claro, escuro, papel antigo, neon moderno e minimalista.
- Modo estudo com interface focada e timer.
- Backup em JSON, importação de dados e limpeza com confirmação.
- Layout responsivo para computador, tablet e celular.

## Estrutura

```text
.
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── img/
│   │   └── favicon.svg
│   └── js/
│       └── app.js
├── site.webmanifest
├── README.md
├── LICENSE
└── .github/
    └── workflows/
        └── pages.yml
```

## Como Rodar

Basta abrir o arquivo `index.html` no navegador.

Também é possível usar qualquer servidor estático local, por exemplo a extensão Live Server do VS Code.

## Como Publicar No GitHub Pages

1. Crie um repositório no GitHub.
2. Envie estes arquivos para a branch `main`.
3. No GitHub, acesse `Settings > Pages`.
4. Em `Build and deployment`, escolha `GitHub Actions`.
5. O workflow `.github/workflows/pages.yml` publicará o site automaticamente.

## Dados E Privacidade

Todos os dados ficam salvos no navegador do usuário usando `localStorage`. Nenhuma informação é enviada para servidor.

Use o botão de backup no app para exportar seus dados em JSON antes de trocar de navegador, limpar cache ou formatar o computador.

## Licença

Este projeto está sob a licença MIT.
