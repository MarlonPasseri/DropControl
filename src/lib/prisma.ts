import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function getPrismaPgConfig(): ConstructorParameters<typeof PrismaPg>[0] {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
    };
  }

  if (
    process.env.DB_USER &&
    process.env.DB_PASS &&
    process.env.DB_NAME &&
    process.env.INSTANCE_UNIX_SOCKET
  ) {
    return {
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      host: process.env.INSTANCE_UNIX_SOCKET,
    };
  }

  return {
    connectionString: "postgresql://user:pass@localhost:5432/dropship_control",
  };
}

const adapter = new PrismaPg(getPrismaPgConfig());

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
