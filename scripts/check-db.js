/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const rawDatabaseUrl = process.env.DATABASE_URL;

function normalizeDatabaseUrl(value) {
  if (!value) {
    return null;
  }

  return value.trim().replace(/^DATABASE_URL=/, "").replace(/^['"]|['"]$/g, "");
}

const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);

function maskUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return "DATABASE_URL invalida";
  }
}

function getUrlInfo(value) {
  if (!value) {
    return null;
  }

  const url = new URL(value);
  return {
    user: decodeURIComponent(url.username),
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.replace(/^\//, ""),
    schema: url.searchParams.get("schema") || "public",
    sslmode: url.searchParams.get("sslmode") || "none",
  };
}

function getActionableHint(error, info) {
  const message = error && error.message ? error.message : String(error);

  if (message.includes("no encryption")) {
    return [
      "O Cloud SQL recusou a conexao sem criptografia.",
      `Adicione sslmode=require na DATABASE_URL do banco "${info.database}".`,
      "Exemplo: postgresql://USUARIO:SENHA@HOST:5432/BANCO?schema=public&sslmode=require&uselibpqcompat=true",
    ];
  }

  if (message.includes("unable to verify the first certificate")) {
    return [
      "A conexao TLS abriu, mas o Node nao conseguiu validar a cadeia do certificado.",
      "Para desenvolvimento por IP publico, use sslmode=require&uselibpqcompat=true.",
      "Para producao, prefira Cloud SQL Auth Proxy/Connector ou configure a CA do Cloud SQL no cliente.",
    ];
  }

  if (error && error.code === "P1010") {
    return [
      `P1010: o usuario "${info.user}" nao tem permissao para acessar o banco "${info.database}".`,
      "Aplique os GRANTs do guia docs/cloud-sql.md ou use o usuario dono do banco.",
    ];
  }

  return [message];
}

async function main() {
  if (!databaseUrl) {
    console.error("DATABASE_URL nao encontrada em .env.local ou .env.");
    process.exitCode = 1;
    return;
  }

  let info;
  try {
    info = getUrlInfo(databaseUrl);
  } catch {
    console.error("DATABASE_URL invalida.");
    console.error("Use apenas uma atribuicao, assim:");
    console.error(
      'DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/BANCO?schema=public&sslmode=require&uselibpqcompat=true"',
    );
    console.error("Nao use DATABASE_URL=DATABASE_URL=...");
    process.exitCode = 1;
    return;
  }

  console.log("DATABASE_URL:", maskUrl(databaseUrl));
  console.log(
    `Destino: user=${info.user}; host=${info.host}; port=${info.port}; database=${info.database}; schema=${info.schema}; sslmode=${info.sslmode}`,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
    }),
    log: ["error"],
  });

  try {
    const [connection] = await prisma.$queryRaw`
      SELECT
        current_database() AS database,
        current_user AS "user",
        current_schema() AS schema
    `;

    const tables = await prisma.$queryRaw`
      SELECT
        to_regclass('public.users')::text AS users,
        to_regclass('public.orders')::text AS orders,
        to_regclass('public.audit_logs')::text AS audit_logs,
        to_regclass('public.security_events')::text AS security_events
    `;

    console.log(
      `Conectado: database=${connection.database}; user=${connection.user}; schema=${connection.schema}`,
    );
    console.log("Tabelas principais:", tables[0]);
    console.log("OK: banco acessivel pelo Prisma.");
  } catch (error) {
    console.error("Falha ao acessar o banco pelo Prisma.");
    for (const line of getActionableHint(error, info)) {
      console.error(line);
    }

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
