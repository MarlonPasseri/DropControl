# Dropship Control

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.4-000000?logo=next.js&logoColor=white)](https://nextjs.org/docs)
[![React 19](https://img.shields.io/badge/React-19.2.4-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Prisma 7](https://img.shields.io/badge/Prisma-7.7.0-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/docs)
[![Auth.js 5](https://img.shields.io/badge/Auth.js-5_beta-7C3AED?logo=auth0&logoColor=white)](https://authjs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Docker-336791?logo=postgresql&logoColor=white)](./docs/docker-db.md)
[![MVP Fase 4](https://img.shields.io/badge/MVP-Fase%204-16A34A)](./docs/mvp-backlog.md#fase-4---financeiro)
[![Rodar localmente](https://img.shields.io/badge/Rodar-localmente-2563EB)](#rodando-localmente)
[![Ver rotas](https://img.shields.io/badge/Ver-rotas-F59E0B)](#rotas-principais)

Sistema operacional para dropshipping com autenticacao, cadastros, pedidos, tarefas e financeiro com calculo real de margem e lucro.

## O que ja esta pronto

- autenticacao com Auth.js Credentials e Google OAuth
- layout privado com sidebar e fluxo protegido por proxy
- CRUD real de produtos, fornecedores, pedidos, tarefas e lancamentos financeiros
- dashboard com alertas, pedidos criticos e lucro mensal ajustado pelo financeiro
- Prisma com PostgreSQL local via Docker
- backlog e wireframes do MVP dentro de `docs/`

## Stack

- Next.js 16
- React 19
- Prisma 7
- Auth.js 5 beta
- PostgreSQL
- Tailwind CSS 4
- Zod

## Rotas principais

- `/login`
- `/dashboard`
- `/products`
- `/suppliers`
- `/orders`
- `/finance`
- `/tasks`

## Documentacao

- [Mapa de navegacao](./docs/mvp-navigation.md)
- [Wireframes do MVP](./docs/mvp-wireframes.md)
- [Backlog por fases](./docs/mvp-backlog.md)
- [Banco local com Docker](./docs/docker-db.md)
- [Schema Prisma](./prisma/schema.prisma)
- [Config do Prisma](./prisma.config.ts)

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Suba o PostgreSQL:

```bash
npm run db:up
```

3. Aplique a migration inicial:

```bash
npm run db:migrate
```

4. Inicie o projeto:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Variaveis de ambiente

O exemplo versionado esta em [.env.example](./.env.example).

Preencha principalmente:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

No Google Cloud Console, cadastre a URL de redirecionamento local:

```bash
http://localhost:3000/api/auth/callback/google
```

## Scripts uteis

```bash
npm run dev
npm run lint
npm run build
npm run db:up
npm run db:down
npm run db:status
npm run db:logs
npm run db:migrate
npm run db:studio
```

## Financeiro

A Fase 4 fecha o loop do MVP com:

- CRUD de lancamentos financeiros
- recalculo de lucro por pedido
- resumo financeiro mensal
- lucro por produto
- lucro por fornecedor
- visao de reembolsos
