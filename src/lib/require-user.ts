import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserById } from "@/lib/data/users";
import { resolveAppRoleForUser, type AppRole } from "@/lib/security/roles";

type RequiredUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: AppRole;
};

export async function requireUser(): Promise<RequiredUser> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

export async function requireAdminUser(): Promise<RequiredUser> {
  const sessionUser = await requireUser();
  const dbUser = await getUserById(sessionUser.id);

  if (!dbUser) {
    redirect("/login");
  }

  const role = await resolveAppRoleForUser(dbUser);

  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return {
    ...sessionUser,
    role,
  };
}
