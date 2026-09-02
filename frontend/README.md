# Frontend — Pedidos do Festival

SPA Angular (standalone components). Ver decisões de arquitetura e de UI no
[README da raiz do repositório](../README.md).

## Como rodar

```bash
npm install
npm start
```

Acesse `http://localhost:4200`. A aplicação espera a API do backend rodando
em `http://localhost:3000` (configurável em
`src/app/core/config/api.config.ts`).

## Scripts

| Script         | O que faz                              |
| -------------- | --------------------------------------- |
| `npm start`    | Dev server com live reload               |
| `npm run build`| Build de produção (`dist/frontend/`)    |
| `npm test`     | Testes unitários (Vitest)                |
