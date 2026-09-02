# Backend — API de Pedidos

API NestJS + Prisma + PostgreSQL. Ver decisões de arquitetura, modelagem de
dados e índices no [README da raiz do repositório](../README.md).

## Como rodar

```bash
cp .env.example .env      # ajuste DATABASE_URL se necessário
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

API em `http://localhost:3000`.

## Scripts

| Script                  | O que faz                                          |
| ------------------------ | --------------------------------------------------- |
| `npm run start:dev`      | API em modo watch                                   |
| `npm run build`          | Build de produção (`dist/`)                          |
| `npm run start:prod`     | Roda o build de produção                             |
| `npm test`               | Testes unitários (Jest)                              |
| `npm run test:cov`       | Testes com relatório de cobertura                    |
| `npm run test:e2e`       | Testes e2e                                           |
| `npm run lint`           | ESLint                                               |

## Prisma

| Comando                        | O que faz                                                        |
| -------------------------------- | ------------------------------------------------------------------- |
| `npx prisma migrate dev`         | Cria e aplica uma nova migration a partir de mudanças no schema     |
| `npx prisma migrate deploy`      | Aplica migrations pendentes (uso em CI/produção)                    |
| `npx prisma db seed`             | Popula o banco com dados de exemplo (`prisma/seed.ts`)              |
| `npx prisma studio`              | UI para inspecionar os dados                                        |
