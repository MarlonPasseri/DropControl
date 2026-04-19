import { prisma } from "@/lib/prisma";

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

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
    },
  });
}
