import { prisma } from "@/lib/prisma";
import { getEffectiveAppRole, type AppRole } from "@/lib/security/roles";

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
}

export async function getUserCount() {
  return prisma.user.count();
}

export async function listUsersWithAccessRoles() {
  const [users, firstRegisteredUser] = await prisma.$transaction([
    prisma.user.findMany({
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.findFirst({
      select: {
        id: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const firstRegisteredUserId = firstRegisteredUser?.id ?? null;

  return users.map((user) => ({
    ...user,
    accessRole: getEffectiveAppRole({
      userId: user.id,
      storedRole: user.role,
      firstRegisteredUserId,
    }),
  }));
}

export async function countUsersByAccessRole() {
  const users = await listUsersWithAccessRoles();

  return users.reduce(
    (summary, user) => {
      summary.total += 1;
      summary[user.accessRole] += 1;
      return summary;
    },
    {
      total: 0,
      ADMIN: 0,
      OPERATOR: 0,
    } satisfies Record<AppRole | "total", number>,
  );
}

export async function createUser(input: {
  name: string;
  email: string;
  image?: string | null;
  passwordHash?: string | null;
  role?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const existingUsers = await tx.user.count();

    return tx.user.create({
      data: {
        name: input.name,
        email: input.email.trim().toLowerCase(),
        image: input.image ?? null,
        passwordHash: input.passwordHash ?? null,
        role: input.role ?? (existingUsers === 0 ? "ADMIN" : "OPERATOR"),
      },
    });
  });
}

export async function updateUserProfile(
  id: string,
  input: {
    name: string;
    phone?: string | null;
    company?: string | null;
    image?: string | null;
  },
) {
  return prisma.user.update({
    where: {
      id,
    },
    data: input,
  });
}

export async function updateUserAccessRole(id: string, role: AppRole) {
  return prisma.user.update({
    where: {
      id,
    },
    data: {
      role,
    },
  });
}
