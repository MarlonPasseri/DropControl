import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const APP_ROLES = ["ADMIN", "OPERATOR"] as const;

export type AppRole = (typeof APP_ROLES)[number];

const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
};

const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  ADMIN: "ADMIN",
  ADMINISTRADOR: "ADMIN",
  OPERATOR: "OPERATOR",
  OPERADOR: "OPERATOR",
};

type UserRoleSource = Pick<User, "id" | "role">;

function normalizeRoleKey(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

export function parseStoredAppRole(value: string | null | undefined): AppRole | null {
  if (!value) {
    return null;
  }

  return LEGACY_ROLE_ALIASES[normalizeRoleKey(value)] ?? null;
}

export function getEffectiveAppRole(input: {
  userId: string;
  storedRole?: string | null;
  firstRegisteredUserId?: string | null;
}): AppRole {
  return (
    parseStoredAppRole(input.storedRole) ??
    (input.firstRegisteredUserId === input.userId ? "ADMIN" : "OPERATOR")
  );
}

export function getRoleLabel(role: AppRole) {
  return ROLE_LABELS[role];
}

export function isAdminRole(role: AppRole | null | undefined) {
  return role === "ADMIN";
}

export async function resolveAppRoleForUser(user: UserRoleSource): Promise<AppRole> {
  const firstRegisteredUser = await prisma.user.findFirst({
    select: {
      id: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return getEffectiveAppRole({
    userId: user.id,
    storedRole: user.role,
    firstRegisteredUserId: firstRegisteredUser?.id ?? null,
  });
}
