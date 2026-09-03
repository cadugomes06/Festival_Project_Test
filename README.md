# Sistema de Visualização de Pedidos do Festival

Teste técnico full-stack: visualização de pedidos de um festival, com filtros
e modal de detalhes (itens do pedido + dados do comprador).

Separei o repositório em dois projetos independentes, cada um com seu próprio
gerenciador de dependências e build:

```
backend/   API NestJS + Prisma + PostgreSQL
frontend/  SPA Angular
```

## Stack e versões

| Camada   | Tecnologia            | Versão usada | Observação                                                                                                                                                            |
| -------- | ---------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | NestJS                 | 10.x         | O CLI mais novo (v12) já gera projetos em ESM + Vitest + oxlint por padrão. Fiquei na v10, com CommonJS + **Jest**, porque é o setup pedido explicitamente e o mais amplamente documentado/ensinado hoje. |
| Backend  | Prisma                 | 6.19.x       | Prisma 7/8 (RC) trocaram o gerador padrão do client e o fluxo de `prisma.config.ts` de forma recente e pouco documentada. Preferi a 6.x, que é a versão estável mais usada em tutoriais e na própria doc oficial do Nest. |
| Frontend | Angular                | 21.x (LTS)   | `npm view @angular/cli dist-tags` mostra `v21-lts` como a **LTS mais recente estável** (a v22 ainda está em fase ativa, não LTS), então segui à risca o que foi pedido. |

## Como rodar

### 1. Banco de dados

```bash
docker compose up -d
```

Sobe um Postgres 16 local na porta `5432` com as credenciais já usadas em
`backend/.env.example` (`postgres`/`postgres`, banco `festival_pedidos`). Se
preferir usar um Postgres já existente, é só ajustar `backend/.env` livremente.

### 2. Backend

```bash
cd backend
cp .env.example .env      # ajuste DATABASE_URL se necessário
npm install
npx prisma migrate deploy # aplica a migration versionada
npx prisma db seed        # popula dados de exemplo (clientes, itens, pedidos)
npm run start:dev
```

API sobe em `http://localhost:3000`. Endpoints:

- `POST /auth/login`: `{ email, password }` → `{ accessToken }` (ver seção
  [Autenticação](#autenticação); credencial de dev: `admin@festival.com` /
  `festival2026`)
- `GET /orders?dataInicio&dataFim&valorMin&valorMax&nomeCliente&page&limit`: lista filtrada e paginada (`page`/`limit` opcionais, padrão 1/10) → `{ data, total, page, limit, totalPages }` (requer `Authorization: Bearer <token>`)
- `GET /orders/:id`: detalhe do pedido (itens + comprador) (idem)
- `GET /health`: healthcheck
- `GET /docs`: documentação interativa (Swagger UI)

Todos os endpoints têm rate limit de 100 req/min por IP (ver seção
[Autenticação](#autenticação) → Rate limiting).

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

SPA sobe em `http://localhost:4200` e consome a API em `http://localhost:3000`
(a URL da API está fixa em `frontend/src/app/core/config/api.config.ts`, e
explico o porquê mais adiante, na seção de decisões do frontend).

### Testes

```bash
cd backend && npm test        # Jest: regras de negócio (cálculo de total, filtro por valor, casos de erro)
cd backend && npm run test:e2e # Jest e2e: login, guard, listagem/detalhe/404 via HTTP real (requer o banco de dev rodando e seedado)
cd frontend && npm test       # Vitest (padrão do Angular CLI 21): componentes standalone
```

---

## Decisões de modelagem de dados

A relação entre Pedido e Item é N:N através de uma tabela de associação
(`order_item`), que guarda `quantidade` e `valor_unitario_praticado`, não
apenas uma referência ao `Item`. Fiz isso porque o valor de um item pode ser
reajustado depois da venda, e o pedido precisa preservar o valor histórico
praticado naquela transação. Simulei esse cenário no próprio seed
(`backend/prisma/seed.ts`): uma cerveja cadastrada a R$12 é vendida por R$10
em um pedido específico, exatamente pra deixar essa decisão visível nos dados.

Na nomenclatura, optei por manter tabelas e colunas em `snake_case` no
Postgres, mapeadas para `camelCase` no Prisma Client via `@map`/`@@map`,
porque cada lado (banco e TypeScript) segue a convenção que é idiomática pra
ele.

### Índices

| Índice                         | Onde                    | Por quê                                                                 |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `pedidos_data_idx`              | `Pedido.data`             | Filtro obrigatório por período (`gte`/`lte`) e o `orderBy` da listagem.  |
| `pedidos_cliente_id_idx`        | `Pedido.clienteId` (FK)   | Postgres não indexa FK automaticamente; sem isso o join com `Cliente` e a checagem de integridade referencial fariam table scan. |
| `clientes_nome_idx`             | `Cliente.nome`, tipo **GIN** com extensão `pg_trgm` | Filtro obrigatório por nome do cliente, feito via `ILIKE '%termo%'` (busca por substring). |
| `order_item_item_id_idx`        | `OrderItem.itemId` (FK)   | Mesma razão do índice de `clienteId`: permite checar rapidamente se um `Item` tem pedidos associados antes de um delete. |

Escolhi GIN com `pg_trgm` no índice de `nome` em vez de um B-tree comum
porque um B-tree é bom para igualdade e busca por prefixo, mas não acelera
`ILIKE '%termo%'`, que é o padrão de busca do filtro por nome, com wildcard
nas duas pontas. A extensão `pg_trgm` indexa trigramas do texto, e é isso
que faz um índice GIN acelerar de verdade esse tipo de busca por substring.
Pra validar que a escolha realmente compensa, rodei um teste com 500 mil
clientes sintéticos (dentro de uma transação com `ROLLBACK`, sem sujar o
banco) comparando as duas estratégias: sem usar o índice, a busca levou
~79ms varrendo a tabela inteira; usando o GIN, caiu pra ~1,4ms, uma
diferença de quase 60x que só cresce conforme a base aumenta. O custo dessa
escolha foi baixo: habilitar a preview feature `postgresqlExtensions` do
Prisma (`schema.prisma` → `generator client` e `datasource db`) e criar a
extensão `pg_trgm` no banco (já embutido na migration versionada).

Também decidi *não* criar um índice em `OrderItem.pedidoId`: como já existe
`@@unique([pedidoId, itemId])`, isso já gera um índice composto começando
por `pedidoId`, então um índice separado seria redundante (todo índice
B-tree também serve buscas pelo seu prefixo esquerdo) e só custaria escrita
extra a cada insert/update, sem ganho nenhum de leitura.

---

## Arquitetura do backend

Segui os princípios de Clean Architecture aqui: a regra de negócio (domain)
fica isolada de detalhes técnicos como Prisma e HTTP, que ficam concentrados
em infrastructure e presentation. Camadas dentro de `backend/src/orders/`:

```
domain/
  entities/            OrderEntity, OrderItemEntity: regra de negócio pura
                        (valorTotal), sem Prisma, sem decorators do Nest.
application/
  services/             OrdersService: o caso de uso (orquestra a regra de negócio).
  dto/                   DTOs de entrada/saída da API.
  interfaces/            OrdersRepository: o contrato que o caso de uso exige
                        do mundo externo, mais o token de injeção.
infrastructure/
  repositories/          PrismaOrdersRepository: única classe que conhece o Prisma.
presentation/
  controllers/           OrdersController: só traduz HTTP ⇄ caso de uso.
orders.module.ts        "Wiring": liga a interface à implementação concreta.
```

Organizei cada subpasta agrupando arquivos do mesmo tipo (um `services/`, um
`controllers/`, um `repositories/`...) pensando em escala: hoje só existe um
arquivo em cada uma, mas a estrutura já fica pronta pra um projeto maior, com
múltiplos serviços/controllers/repositórios por módulo, sem precisar
reorganizar nada depois. A única exceção proposital é `orders.module.ts`,
que fica na raiz do módulo, porque é onde o Nest sempre espera encontrar o
arquivo de módulo de uma feature, em qualquer projeto Nest.

Optei por uma interface de repositório em vez de injetar o Prisma direto no
service pensando em inversão de dependência (SOLID/DIP): `OrdersService`
depende da abstração `OrdersRepository`, não da implementação Prisma. Na
prática isso significa que `orders.service.spec.ts` testa a regra de negócio
(cálculo de total, filtro por faixa de valor, 404) com um repositório *fake*
em memória, sem precisar de banco de dados nos testes unitários. Um detalhe
específico do Nest aqui: como interfaces TypeScript não existem em tempo de
execução, o token de injeção precisa ser um `Symbol` (`ORDERS_REPOSITORY`),
que é o padrão documentado no guia de "Custom providers" do Nest.

Uma decisão que vale destacar: o filtro por valor é aplicado em memória, não
via SQL. O valor total do pedido é uma soma agregada sobre `order_item`
(`quantidade * valor_unitario_praticado`), não uma coluna própria de
`Pedido`. O repositório busca os pedidos já filtrados por data/cliente via
Prisma, o `OrdersService` calcula o total via `OrderEntity.valorTotal`
(regra de domínio) e só então aplica o filtro de faixa.

A paginação (`page`/`limit`, padrão 1/10) acontece logo depois, no mesmo
passo em memória: como o filtro de valor já não é feito via SQL, `total` e
`totalPages` (`GET /orders` devolve `{ data, total, page, limit, totalPages }`)
precisam refletir o resultado já filtrado por data, cliente e valor, não o
total geral de pedidos, então fatiar (`slice`) o array final foi mais simples
e correto do que tentar paginar só a consulta ao Prisma e filtrar valor
depois (o que devolveria páginas com menos itens do que o `limit` pedido).
Testei isso na prática rodando um `EXPLAIN ANALYZE` comparando as duas
abordagens (ver seção de índices) antes de decidir; a diferença de
performance entre agregar no banco (`HAVING`) ou em memória só compensa a
partir de um volume que este teste não tem, e paginar depois do filtro de
valor evita esse problema por completo.

Pra dinheiro, usei `decimal.js` em vez de `number` puro: `OrderItemEntity`/
`OrderEntity` fazem toda a matemática (subtotal, soma do total, comparação
de faixa de valor) com `Decimal`, a mesma lib que o `Prisma.Decimal` usa por
baixo dos panos, só que sem acoplar o domínio ao `@prisma/client` (essa
conversão de `Prisma.Decimal` pra `Decimal` genérico acontece em
`OrdersService.toDomain()`, bem na fronteira entre Infrastructure e Domain).
Fiz essa escolha porque, com `number` do JS, somar vários itens (`0.1 +
0.2`) pode gerar `0.30000000000000004` em vez de `0.3`, e o `Decimal` só
vira `number` de novo na saída da API (`OrderSummaryDto`/`OrderDetailDto`),
depois que toda a soma já aconteceu com precisão exata.

Pro tratamento de erros, coloquei um filtro global (`HttpExceptionFilter`)
que garante que toda resposta de erro, seja validação (400), não encontrado
(404) ou falha inesperada (500), segue o mesmo formato JSON (`statusCode`,
`path`, `timestamp`, `message`), em vez de deixar stack traces ou formatos
inconsistentes vazarem pro frontend.

Na validação, usei DTOs com `class-validator`/`class-transformer` e um
`ValidationPipe` global com `whitelist: true` + `forbidNonWhitelisted: true`,
assim qualquer campo de query não declarado no DTO é rejeitado com 400, em
vez de ser silenciosamente ignorado.

Também adicionei `@nestjs/swagger` pra gerar uma doc interativa em `/docs`,
direto a partir dos mesmos DTOs já usados pela `ValidationPipe`
(`@ApiProperty`/`@ApiPropertyOptional` nos campos, `@ApiOperation`/
`@ApiOkResponse` nos controllers), assim não corro o risco de manter uma doc
escrita à parte que desatualiza sozinha. Ela já vem com o botão "Authorize"
pra testar os endpoints de `/orders` autenticado com o Bearer token.

E fechei com `helmet` no `main.ts`, junto com CORS e o rate limiting, que é
o conjunto de hardening básico que a própria doc do Nest recomenda pra
qualquer API HTTP.

---

## Autenticação

Optei por uma credencial única fixa em vez de uma tabela de usuários, porque
o domínio deste teste (Cliente/Item/Pedido) não tem conceito de
usuário/autenticação, desenvolvi apenas um login simples e direto.

Pra implementar, usei Passport + `@nestjs/jwt` (`src/auth/`), que é o padrão
documentado do próprio Nest: `POST /auth/login` valida a credencial e assina
um JWT (`JwtService`); `JwtStrategy` (Passport) valida o Bearer token nas
rotas protegidas; `JwtAuthGuard` é só o `AuthGuard('jwt')` do Passport
aplicado com `@UseGuards()` no `OrdersController`, e assim todos os
endpoints de pedidos passam a exigir um token válido. Mantive a mesma
separação em camadas do módulo de pedidos (`application` pro caso de
uso/DTO, `presentation` pro controller, `strategies`/`guards` como peças de
infraestrutura do Passport).

No frontend, `core/auth/` guarda o token no `localStorage` (`AuthService`),
um guard funcional (`authGuard`, `CanActivateFn`, o padrão atual do Angular
Router) bloqueia a rota `''` sem sessão, e um interceptor funcional
(`authInterceptor`, `HttpInterceptorFn`) anexa o header `Authorization:
Bearer` em toda chamada HTTP e desloga automaticamente em qualquer resposta
401. A tela de login (`auth/login-page/`) segue o mesmo padrão dos outros
formulários do projeto (Reactive Forms + SCSS/BEM), pra manter tudo
consistente.

Pra rodar localmente, o login de desenvolvimento (`backend/.env.example`) é
`admin@festival.com` / `festival2026`, que vale só pra rodar o projeto neste
teste.

Assumi algumas limitações conscientemente: sem refresh token, sem múltiplos
usuários, sem "lembrar-me". O JWT expira (`JWT_EXPIRES_IN`, 1h por padrão) e
o usuário loga de novo. É suficiente pro escopo de "proteger a tela de
pedidos", mas está longe de ser um sistema de autenticação de produção.

Também adicionei rate limiting (`@nestjs/throttler`, em `app.module.ts`):
100 requisições por IP a cada 60 segundos, aplicado globalmente via
`APP_GUARD`, que é o padrão documentado do próprio `@nestjs/throttler`, em
vez de decorar cada controller manualmente. O motivo principal foi o
`POST /auth/login` usar uma credencial fixa: tentativas de senha ilimitadas
seriam o vetor de ataque mais óbvio contra ela, e o mesmo guard de quebra
acaba protegendo os demais endpoints contra uso abusivo. Escolhi um limite
generoso o bastante pra não incomodar o uso normal da tela (a cada
requisição de listagem/detalhe), mas suficiente pra tornar força bruta
impraticável.

---

## Arquitetura do frontend

Estruturei por feature, sem tudo num módulo único:

```
core/     config (URL da API) e models (contratos com a API): cross-cutting.
shared/   componentes reutilizáveis e sem estado (loading spinner, error message).
orders/   a feature em si: OrdersApiService (HTTP puro), OrdersService (estado
          reativo), e os componentes (filtros, listagem, modal, página).
```

Pro estado, fiquei só com RxJS puro em serviço: `OrdersService`
(em `orders/orders.service.ts`) expõe um único `vm$` (view model)
combinando listagem e detalhe, montado com `combineLatest` + `switchMap` +
`startWith` + `catchError`. Modelei cada requisição assíncrona como *um*
stream de estado (dado/loading/erro), em vez de vários `BehaviorSubject`s se
atualizando uns aos outros, o que evita condições de corrida e emissões
duplicadas dentro do `combineLatest`.

A paginação entra nesse mesmo `vm$`: `OrdersService` guarda um
`OrdersQuery` (filtro + `page`/`limit`) num único `BehaviorSubject`, em vez
de um segundo estado separado pra página atual, porque trocar de página é
conceitualmente "a mesma busca, com outro parâmetro" e não um evento
independente. `updateFilter()` sempre volta pra página 1 (novo filtro,
resultado diferente); `goToPage()` só troca o número da página, mantendo o
resto do filtro. O componente `Pagination` (`shared/components/pagination/`)
é "burro" como os outros dessa pasta: só recebe `page`/`totalPages` e emite
`pageChange`, sem saber nada de HTTP.

Escrevi toda a interface (`styles.scss` + SCSS por componente, metodologia
BEM) do zero, com design tokens via CSS custom properties (`--color-primary`,
`--radius-md`, etc.).

Pra responsividade, a tabela de pedidos (`order-list`) usa a mesma marcação
HTML em qualquer largura de tela; abaixo de 720px, o CSS transforma cada
linha num "card" empilhado (`display: block` nas `<tr>`/`<td>`, rótulo via
`content: attr(data-label)`), uma técnica clássica de tabela responsiva que
evita duplicar template pra mobile/desktop.

Fixei o `LOCALE_ID` em `pt-BR` e chamei `registerLocaleData(localePt)` em
`app.config.ts`, pra que `CurrencyPipe`/`DatePipe` formatem como `R$ 75,00`
em vez do padrão `en-US` (`R$75.00`) do Angular.

Sobre cache de build: `outputHashing: "all"` já vem ativo por padrão na
configuração de produção do Angular CLI atual (`angular.json` →
`architect.build.configurations.production`). Confirmei que estava lá, não
precisei ajustar nada manualmente.


## Currículo

`CV_CarlosEduardo.pdf`, na raiz do repositório.
