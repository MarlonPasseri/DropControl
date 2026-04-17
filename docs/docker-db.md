# Banco local com Docker

## Stack

- Docker Compose
- PostgreSQL 16
- volume persistente `postgres_data`

## Arquivos

- `compose.yaml`
- `.env`
- `.env.example`

## Comandos principais

```bash
npm run db:up
npm run db:status
npm run db:migrate
npm run db:logs
```

## Credenciais locais

- host: `localhost`
- porta: `5432`
- banco: `dropship_control`
- usuario: `dropship`

## Connection string

```bash
postgresql://dropship:dropship_local_password@localhost:5432/dropship_control?schema=public
```

## Derrubar o banco

```bash
npm run db:down
```

O volume nomeado do Docker preserva os dados entre reinicios do container.
