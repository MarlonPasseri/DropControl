import { DefaultSession } from "next-auth";

type SessionRole = "ADMIN" | "OPERATOR";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: SessionRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: SessionRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    role?: SessionRole;
  }
}
