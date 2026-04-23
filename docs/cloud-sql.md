# Cloud SQL para PostgreSQL

Este app ja usa PostgreSQL via Prisma. Para sair do banco local, a troca principal e apontar `DATABASE_URL` para o Cloud SQL e garantir que o usuario tenha permissao no banco e no schema.

## Diagnostico atual

O erro abaixo significa que o app conseguiu chegar no servidor PostgreSQL, mas o usuario da `DATABASE_URL` foi bloqueado no banco informado:

```txt
P1010: User was denied access on the database `dropcontrol`
```

No Cloud SQL for PostgreSQL, usuarios e roles controlam acesso ao banco. Mesmo com rede liberada, o usuario precisa ter permissao de `CONNECT` no database e permissao de uso/criacao no schema `public`.

Neste ambiente, tambem foram observados dois pontos:

- A conexao por IP publico foi recusada sem criptografia: use SSL/TLS.
- As tabelas existem e pertencem ao usuario `dropcontrol`, entao uma `DATABASE_URL` com usuario `postgres` nao consegue ler tabelas como `users` se esse usuario nao recebeu GRANTs do owner.

## Modelo recomendado

Para producao, prefira:

- Cloud SQL com IP privado quando o app estiver em Google Cloud na mesma VPC.
- Cloud SQL Auth Proxy ou Cloud SQL Connector quando precisar conectar com identidade verificada e tunel criptografado.
- IP publico apenas para desenvolvimento/transicao, com Authorized networks restrito ao IP do app e SSL/TLS habilitado.
- Um usuario de aplicacao dedicado, por exemplo `dropcontrol_app`, em vez de usar `postgres` no runtime.
- Senhas e `DATABASE_URL` em Secret Manager ou variaveis seguras da plataforma, nao em arquivo versionado.

## Criar banco e usuario

No Cloud SQL, crie:

- database: `dropcontrol`
- usuario: `dropcontrol_app`

Depois aplique as permissoes do template:

```bash
scripts/cloud-sql-grants.sql
```

Se voce usar o `psql`, a sequencia fica assim:

```sql
GRANT CONNECT ON DATABASE dropcontrol TO dropcontrol_app;
GRANT ALL PRIVILEGES ON DATABASE dropcontrol TO dropcontrol_app;
ALTER DATABASE dropcontrol OWNER TO dropcontrol_app;

\connect dropcontrol

GRANT USAGE, CREATE ON SCHEMA public TO dropcontrol_app;
ALTER SCHEMA public OWNER TO dropcontrol_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dropcontrol_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO dropcontrol_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dropcontrol_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO dropcontrol_app;
```

Para um ambiente pequeno, o `dropcontrol_app` pode rodar as migrations e o app. O proximo passo de seguranca e separar um usuario migrator, dono do schema, de um usuario runtime com permissoes menores.

## Configurar DATABASE_URL

Para Cloud SQL via IP publico em desenvolvimento:

```env
DATABASE_URL="postgresql://dropcontrol_app:SENHA_FORTE@IP_PUBLICO:5432/dropcontrol?schema=public&sslmode=require&uselibpqcompat=true"
```

O parametro `sslmode=require` evita a rejeicao por conexao sem criptografia. O parametro `uselibpqcompat=true` faz o driver tratar `sslmode=require` como o `libpq` do Postgres para conexao direta por IP publico.

Para producao, prefira Cloud SQL Auth Proxy/Connector ou configure a CA do Cloud SQL no cliente em vez de depender de IP publico.

## Corrigir o caso atual

Hoje a URL local aponta para o usuario `postgres`, mas as tabelas sao do usuario `dropcontrol`. Escolha um dos caminhos:

1. Resetar a senha do usuario `dropcontrol` no Cloud SQL e usar:

```env
DATABASE_URL="postgresql://dropcontrol:NOVA_SENHA@IP_PUBLICO:5432/dropcontrol?schema=public&sslmode=require&uselibpqcompat=true"
```

2. Entrar no banco como `dropcontrol` e conceder permissao para o usuario de runtime:

```sql
GRANT CONNECT ON DATABASE dropcontrol TO postgres;
GRANT USAGE, CREATE ON SCHEMA public TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO postgres;
```

O caminho 1 e mais simples agora. O caminho ideal depois e criar `dropcontrol_app`, conceder os GRANTs a ele e parar de usar `postgres` no app.

## Validar conexao

Sem iniciar o app:

```bash
npm run db:check
```

Esse comando mostra host, usuario, database, schema e SSL, mas mascara a senha. Se ele retornar `P1010`, ainda faltam permissoes no banco.

Depois aplique as migrations:

```bash
npm run db:migrate:deploy
```

Por fim:

```bash
npm run dev
```

## Checklist para sair do local

- Rotacionar qualquer senha que ja tenha sido colada em arquivo versionado.
- Confirmar que `.env.local` nao sera commitado.
- Usar `dropcontrol_app` ou outro usuario dedicado, nao `postgres`.
- Usar `sslmode=require` se conectar por IP publico.
- Restringir Authorized networks ao IP real do servidor/app.
- Ativar backups automaticos e teste de restore.
- Rodar `npm run db:check` antes de `npm run dev`.
- Rodar `npm run db:migrate:deploy` sempre que houver migrations novas.

## Referencias

- Google Cloud: [Cloud SQL users and roles](https://cloud.google.com/sql/docs/postgres/users)
- Google Cloud: [Cloud SQL connection options](https://cloud.google.com/sql/docs/postgres/connection-options)
- Google Cloud: [Configure public IP](https://cloud.google.com/sql/docs/postgres/configure-ip)
- Google Cloud: [Configure SSL/TLS certificates](https://cloud.google.com/sql/docs/postgres/configure-ssl-instance)
