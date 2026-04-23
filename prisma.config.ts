import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

function getDatasourceUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (
    process.env.DB_USER &&
    process.env.DB_PASS &&
    process.env.DB_NAME &&
    process.env.INSTANCE_UNIX_SOCKET
  ) {
    const params = new URLSearchParams({
      host: process.env.INSTANCE_UNIX_SOCKET,
      schema: "public",
    });

    return `postgresql://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(
      process.env.DB_PASS,
    )}@localhost/${encodeURIComponent(process.env.DB_NAME)}?${params.toString()}`;
  }

  return "postgresql://user:pass@localhost:5432/dropship_control";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatasourceUrl(),
  },
});
