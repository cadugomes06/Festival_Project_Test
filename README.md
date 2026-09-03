# Sistema de Visualização de Pedidos — Festival

Teste técnico full-stack: visualização de pedidos de um festival, com filtros
e modal de detalhes (itens do pedido + dados do comprador).

Repositório dividido em dois projetos independentes, cada um com seu próprio
gerenciador de dependências e build:

```
backend/   API NestJS + Prisma + PostgreSQL
frontend/  SPA Angular
```

## Stack e versões

| Camada   | Tecnologia            | Versão usada | Observação                                                                                                                                                            |
| -------- | ---------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | NestJS                 | 10.x         | O CLI mais novo (v12) já gera projetos em ESM + Vitest + oxlint por padrão. Fixei na v10 — CommonJS + **Jest** — porque é o setup pedido explicitamente e o mais amplamente documentado/ensinado hoje. |
| Backend  | Prisma                 | 6.19.x       | Prisma 7/8 (RC) trocaram o gerador padrão do client e o fluxo de `prisma.config.ts` de forma recente e pouco documentada. 6.x é a versão estável mais usada em tutoriais e na própria doc oficial do Nest. |
| Frontend | Angular                | 21.x (LTS)   | `npm view @angular/cli dist-tags` mostra `v21-lts` como a **LTS mais recente estável** (a v22 ainda está em fase ativa, não LTS) — decisão literal do que foi pedido. |

## Como rodar

### 1. Banco de dados

```bash
docker compose up -d
```

Sobe um Postgres 16 local na porta `5432` com as credenciais já usadas em
`backend/.env.example` (`postgres`/`postgres`, banco `festival_pedidos`). Se
preferir usar um Postgres já existente, ajuste `backend/.env` livremente.

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

- `POST /auth/login` — `{ email, password }` → `{ accessToken }` (ver seção
  [Autenticação](#autenticação); credencial de dev: `admin@festival.com` /
  `festival2026`)
- `GET /orders?dataInicio&dataFim&valorMin&valorMax&nomeCliente` — lista filtrada (requer `Authorization: Bearer <token>`)
- `GET /orders/:id` — detalhe do pedido (itens + comprador) (idem)
- `GET /health` — healthcheck
- `GET /docs` — documentação interativa (Swagger UI)

Todos os endpoints têm rate limit de 100 req/min por IP (ver seção
[Autenticação](#autenticação) → Rate limiting).

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

SPA sobe em `http://localhost:4200` e consome a API em `http://localhost:3000`
(URL fixa em `frontend/src/app/core/config/api.config.ts` — ver justificativa
na seção de decisões do frontend).

### Testes

```bash
cd backend && npm test        # Jest — regras de negócio (cálculo de total, filtro por valor, casos de erro)
cd backend && npm run test:e2e # Jest e2e — login, guard, listagem/detalhe/404 via HTTP real (requer o banco de dev rodando e seedado)
cd frontend && npm test       # Vitest (padrão do Angular CLI 21) — componentes standalone
```

---

## Decisões de modelagem de dados

**Pedido ↔ Item é N:N através de uma tabela de associação (`order_item`)** que
guarda `quantidade` e `valor_unitario_praticado` — não apenas uma referência
ao `Item`. Motivo: o valor de um item pode ser reajustado depois da venda, e o
pedido precisa preservar o valor histórico praticado naquela transação. Isso é
simulado no seed (`backend/prisma/seed.ts`): uma cerveja cadastrada a R$12 é
vendida por R$10 em um pedido específico.

Nomenclatura: tabelas/colunas em `snake_case` no Postgres, mapeadas para
`camelCase` no Prisma Client via `@map`/`@@map` (convenção do próprio banco
vs. convenção idiomática do TypeScript).

### Índices

| Índice                         | Onde                    | Por quê                                                                 |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `pedidos_data_idx`              | `Pedido.data`             | Filtro obrigatório por período (`gte`/`lte`) e o `orderBy` da listagem.  |
| `pedidos_cliente_id_idx`        | `Pedido.clienteId` (FK)   | Postgres não indexa FK automaticamente; sem isso o join com `Cliente` e a checagem de integridade referencial fariam table scan. |
| `clientes_nome_idx`             | `Cliente.nome`, tipo **GIN** com extensão `pg_trgm` | Filtro obrigatório por nome do cliente, feito via `ILIKE '%termo%'` (busca por substring). |
| `order_item_item_id_idx`        | `OrderItem.itemId` (FK)   | Mesma razão do índice de `clienteId`: permite checar rapidamente se um `Item` tem pedidos associados antes de um delete. |

**Por que GIN + `pg_trgm` no índice de `nome`, e não um B-tree comum**: um
B-tree é bom para igualdade e busca por prefixo, mas **não** acelera
`ILIKE '%termo%'` — o padrão de busca usado no filtro por nome, com wildcard
nas duas pontas. A extensão `pg_trgm` indexa trigramas do texto, o que faz um
índice GIN acelerar de verdade esse tipo de busca por substring. O custo é
habilitar a preview feature `postgresqlExtensions` do Prisma
(`schema.prisma` → `generator client` e `datasource db`) e a extensão
`CREATE EXTENSION pg_trgm` no banco (já na migration versionada) — pouco
custo para o ganho real num filtro obrigatório do teste.

**Índice que *não* existe de propósito**: `OrderItem` tem
`@@unique([pedidoId, itemId])`, que já cria um índice composto começando por
`pedidoId` — um `@@index([pedidoId])` separado seria redundante (todo índice
B-tree também serve buscas pelo seu prefixo esquerdo), só custando escrita
extra a cada insert/update sem nenhum ganho de leitura.

---

## Arquitetura do backend

Camadas dentro de `backend/src/orders/`:

```
domain/
  entities/            OrderEntity, OrderItemEntity — regra de negócio pura
                        (valorTotal), sem Prisma, sem decorators do Nest.
application/
  services/             OrdersService — o caso de uso (orquestra a regra de negócio).
  dto/                   DTOs de entrada/saída da API.
  interfaces/            OrdersRepository — o contrato que o caso de uso exige
                        do mundo externo, mais o token de injeção.
infrastructure/
  repositories/          PrismaOrdersRepository — única classe que conhece o Prisma.
presentation/
  controllers/           OrdersController — só traduz HTTP ⇄ caso de uso.
orders.module.ts        "Wiring": liga a interface à implementação concreta.
```

Cada subpasta agrupa arquivos do mesmo tipo (um services/, um controllers/,
um repositories/...) pensando em escala: hoje só existe um arquivo em cada
uma, mas a estrutura já está pronta para um projeto maior, com múltiplos
serviços/controllers/repositórios por módulo, sem precisar reorganizar nada
depois. A única exceção proposital é `orders.module.ts`, que fica na raiz do
módulo — é onde o Nest sempre espera encontrar o arquivo de módulo de uma
feature, em qualquer projeto Nest.

**Por que uma interface de repositório em vez de injetar o Prisma direto no
service?** Inversão de dependência (SOLID/DIP): `OrdersService` depende da
abstração `OrdersRepository`, não da implementação Prisma. Na prática isso
significa que `orders.service.spec.ts` testa a regra de negócio (cálculo de
total, filtro por faixa de valor, 404) com um repositório *fake* em memória,
sem precisar de banco de dados nos testes unitários. Prática específica do
Nest: como interfaces TypeScript não existem em tempo de execução, o token de
injeção é um `Symbol` (`ORDERS_REPOSITORY`) — é o padrão documentado no guia
de "Custom providers" do Nest.

**Interpretação do filtro "valor"**: o enunciado lista "valor" como um dos
filtros, sem especificar se é um valor exato ou uma faixa. Tratei como uma
faixa (`valorMin`/`valorMax`, ambos opcionais e combináveis), seguindo o
mesmo padrão do filtro de data (início/fim) — é a interpretação mais útil
para uma tela de filtros e a mais fácil de defender.

**Filtro por valor é aplicado em memória, não via SQL**: o valor total do
pedido é uma soma agregada sobre `order_item` (`quantidade * valor_unitario_praticado`),
não uma coluna própria de `Pedido`. O repositório busca os pedidos já
filtrados por data/cliente via Prisma, o `OrdersService` calcula o total via
`OrderEntity.valorTotal` (regra de domínio) e só então aplica o filtro de
faixa. Para o volume de dados de um teste técnico isso é suficiente e mantém
o cálculo do total num único lugar (o domínio). Em um cenário de produção com
grande volume, o próximo passo seria mover esse filtro para um `HAVING` SQL
agregado direto no repositório — trade-off documentado em
`orders.service.ts`.

**Dinheiro com `decimal.js`, nunca `number` puro**: `OrderItemEntity`/`OrderEntity`
fazem toda a matemática (subtotal, soma do total, comparação de faixa de
valor) com `Decimal` da lib `decimal.js` — a mesma lib que o `Prisma.Decimal`
usa por baixo dos panos, só que sem acoplar o domínio ao `@prisma/client`
(a conversão de `Prisma.Decimal` para `Decimal` genérico acontece em
`OrdersService.toDomain()`, a fronteira entre Infrastructure e Domain). Com
`number` do JS, somar vários itens (`0.1 + 0.2`) pode gerar
`0.30000000000000004` em vez de `0.3` — o `Decimal` só vira `number` de novo
na saída da API (`OrderSummaryDto`/`OrderDetailDto`), depois que toda soma já
aconteceu com precisão exata.

**Tratamento de erros**: filtro global (`HttpExceptionFilter`) garante que
toda resposta de erro — validação (400), não encontrado (404) ou falha
inesperada (500) — segue o mesmo formato JSON (`statusCode`, `path`,
`timestamp`, `message`), em vez de deixar stack traces ou formatos
inconsistentes vazarem para o front-end.

**Validação**: DTOs com `class-validator`/`class-transformer` e
`ValidationPipe` global com `whitelist: true` + `forbidNonWhitelisted: true` —
qualquer campo de query não declarado no DTO é rejeitado com 400, em vez de
ser silenciosamente ignorado.

**Documentação da API (Swagger)**: `@nestjs/swagger` gera uma doc interativa
em `/docs` a partir dos mesmos DTOs já usados pela `ValidationPipe`
(`@ApiProperty`/`@ApiPropertyOptional` nos campos, `@ApiOperation`/
`@ApiOkResponse` nos controllers) — não é uma doc escrita à parte que
desatualiza sozinha. Inclui o botão "Authorize" para testar os endpoints de
`/orders` já autenticado com o Bearer token.

**Cabeçalhos de segurança HTTP (`helmet`)**: aplicado em `main.ts` junto com
CORS e o rate limiting — o conjunto de hardening básico que a própria doc do
Nest recomenda para qualquer API HTTP.

---

## Autenticação

O enunciado trata login como opcional ("não priorizar às custas do resto").
Com os requisitos obrigatórios prontos e testados, adicionei um login com
JWT como diferencial — decisão consciente de escopo, não algo esquecido.

**Credencial única fixa, não uma tabela de usuários**: o domínio deste teste
(Cliente/Item/Pedido) não tem conceito de usuário/autenticação. Criar uma
entidade `User` só para proteger a tela seria escopo extra sem necessidade
real — o próprio CLAUDE.md do projeto pede para não introduzir ferramentas
"porque é desejável" sem justificativa. Em vez disso, backend valida contra
`ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` (variáveis de ambiente). A senha nunca
fica em texto puro, nem no `.env`: o que é armazenado é o hash bcrypt
(`bcryptjs` — versão pura em JS, sem exigir toolchain de compilação nativa
como o pacote `bcrypt` original), comparado com `bcrypt.compare` a cada login.

**Passport + `@nestjs/jwt`, o padrão documentado do Nest** (`src/auth/`):
`POST /auth/login` valida a credencial e assina um JWT (`JwtService`);
`JwtStrategy` (Passport) valida o Bearer token nas rotas protegidas;
`JwtAuthGuard` é só o `AuthGuard('jwt')` do Passport aplicado com
`@UseGuards()` no `OrdersController` — todos os endpoints de pedidos exigem
token válido. Mesma separação em camadas do módulo de pedidos (`application`
para o caso de uso/DTO, `presentation` para o controller, `strategies`/`guards`
como peças de infraestrutura do Passport).

**Frontend**: `core/auth/` guarda o token no `localStorage`
(`AuthService`), um guard funcional (`authGuard`, `CanActivateFn` — o padrão
atual do Angular Router) bloqueia a rota `''` sem sessão, e um interceptor
funcional (`authInterceptor`, `HttpInterceptorFn`) anexa o header
`Authorization: Bearer` em toda chamada HTTP e desloga automaticamente em
qualquer resposta 401. A tela de login (`auth/login-page/`) segue o mesmo
padrão dos outros formulários do projeto (Reactive Forms + SCSS/BEM).

**Login de desenvolvimento** (`backend/.env.example`): `admin@festival.com`
/ `festival2026`. Só serve para rodar o projeto localmente — trocar
`ADMIN_PASSWORD_HASH` (e `JWT_SECRET`) antes de qualquer uso além deste teste.

**Limitações assumidas**: sem refresh token, sem múltiplos usuários, sem
"lembrar-me" — o JWT expira (`JWT_EXPIRES_IN`, 1h por padrão) e o usuário
loga de novo. Suficiente para o escopo de "proteger a tela de pedidos", não
para um sistema de autenticação de produção.

**Rate limiting** (`@nestjs/throttler`, `app.module.ts`): 100 requisições por
IP a cada 60 segundos, aplicado globalmente via `APP_GUARD` — o padrão
documentado do próprio `@nestjs/throttler`, em vez de decorar cada
controller manualmente. Motivo principal: `POST /auth/login` usa uma
credencial fixa, então tentativas de senha ilimitadas seriam o vetor de
ataque mais óbvio contra ela; o mesmo guard também cobre os demais
endpoints contra uso abusivo. Limite generoso o bastante para não incomodar
uso normal da tela (a cada requisição de listagem/detalhe), mas suficiente
para tornar força bruta impraticável.

---

## Arquitetura do frontend

Estrutura por feature, sem tudo num módulo único:

```
core/     config (URL da API) e models (contratos com a API) — cross-cutting.
shared/   componentes reutilizáveis e sem estado (loading spinner, error message).
orders/   a feature em si: OrdersApiService (HTTP puro), OrdersService (estado
          reativo), e os componentes (filtros, listagem, modal, página).
```

**Standalone components, sem NgModules**: desde a v17 o próprio `ng generate`
não cria mais `NgModule`s por padrão — standalone é o jeito atual e
recomendado pela documentação oficial do Angular. A organização "por feature"
pedida continua a mesma, só sem o arquivo de módulo. *(Específico do
Angular/versão: quem aprendeu Angular com NgModules vai notar essa diferença
de sintaxe, mas o princípio de separação por feature é o mesmo.)*

**Estado com RxJS puro em serviço, sem NgRx**: `OrdersService` (em
`orders/orders.service.ts`) expõe um único `vm$` (view model) combinando
listagem e detalhe, montado com `combineLatest` + `switchMap` + `startWith` +
`catchError`. Cada requisição assíncrona é modelada como *um* stream de
estado (dado/loading/erro) em vez de vários `BehaviorSubject`s se atualizando
uns aos outros — evita condições de corrida e emissões duplicadas dentro do
`combineLatest` (achei esse bug rodando os testes: múltiplos subjects se
mutuando causavam um `ExpressionChangedAfterItHasBeenCheckedError`). *(Padrão
específico de RxJS, não Angular em si — o mesmo raciocínio vale em qualquer
app reativo.)*

**CSS/BEM sem Bootstrap ou Material**: toda a interface (`styles.scss` +
SCSS por componente, metodologia BEM) foi escrita do zero, com design tokens
via CSS custom properties (`--color-primary`, `--radius-md`, etc.) — evita o
visual de fábrica dessas libs sem precisar de uma camada extra de
customização.

**Responsividade**: a tabela de pedidos (`order-list`) usa a mesma marcação
HTML em qualquer largura de tela; abaixo de 720px, CSS transforma cada linha
em um "card" empilhado (`display: block` nas `<tr>`/`<td>`, rótulo via
`content: attr(data-label)`) — técnica clássica de tabela responsiva, sem
duplicar template para mobile/desktop.

**Locale pt-BR**: `LOCALE_ID` fixado em `pt-BR` e `registerLocaleData(localePt)`
em `app.config.ts`, para que `CurrencyPipe`/`DatePipe` formatem como
`R$ 75,00` em vez do padrão `en-US` (`R$75.00`) do Angular.

**Sem `environment.ts`/`environment.prod.ts`**: o CLI atual não gera mais
esses arquivos por padrão em projetos novos. Como este teste tem um único
ambiente de deploy, mantive a URL da API como uma constante simples
(`core/config/api.config.ts`) — reintroduzir os arquivos de environment com
`fileReplacements` no `angular.json` seria o caminho idiomático se o projeto
precisasse de múltiplos ambientes.

**Cache de build**: `outputHashing: "all"` já vem ativo por padrão na
configuração de produção do Angular CLI atual (`angular.json` →
`architect.build.configurations.production`) — confirmado, não precisou de
ajuste manual.

---

## O que não foi implementado (e por quê)

- **Redis**: nenhuma necessidade real de cache identificada para o volume de
  dados de um teste técnico; adicionar aumentaria a superfície da aplicação
  sem um problema concreto para justificar.
- **NgRx**: o estado da tela (filtro + listagem + seleção) é simples o
  suficiente para um serviço com RxJS — ver seção de arquitetura do frontend.
- **CRUD de Cliente/Item**: o enunciado pede visualização de pedidos, não
  gestão de clientes/itens; eles só existem como dados de apoio (seed) e são
  expostos apenas através do pedido (listagem e detalhe).

## Currículo

`CV_CarlosEduardo.pdf`, na raiz do repositório (requisito 6).
