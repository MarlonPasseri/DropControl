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
  image?: string | null;
  passwordHash?: string | null;
}) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.trim().toLowerCase(),
      image: input.image ?? null,
      passwordHash: input.passwordHash ?? null,
    },
  });
}

export async function updateUserProfile(
  id: string,
  input: {
    name: string;
    phone?: string | null;
    role?: string | null;
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
