import { DefaultSession } from "next-auth";

type SessionRole = "ADMIN" | "OPERATOR";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: SessionRole;
      mfaEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: SessionRole;
    mfaEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    role?: SessionRole;
    mfaEnabled?: boolean;
  }
}
