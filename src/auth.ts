import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { createUser, getUserByEmail, getUserCount } from "@/lib/data/users";
import { verifyPassword } from "@/lib/password";
import {
  assertSignInAllowed,
  clearSignInFailures,
  recordSignInFailure,
} from "@/lib/security/auth-guard";
import { signInSchema } from "@/lib/validations/auth";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function fallbackNameFromEmail(email: string) {
  return email.split("@")[0] || "Operador";
}

function isVerifiedGoogleProfile(profile: unknown) {
  if (!profile || typeof profile !== "object" || !("email_verified" in profile)) {
    return false;
  }

  return (profile as { email_verified?: unknown }).email_verified === true;
}

async function resolveGoogleUser(input: {
  email?: string | null;
  name?: string | null;
}) {
  const email = normalizeEmail(input.email);

  if (!email) {
    return null;
  }

  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return existingUser;
  }

  const totalUsers = await getUserCount();

  if (totalUsers > 0) {
    return null;
  }

  return createUser({
    name: input.name?.trim() || fallbackNameFromEmail(email),
    email,
    passwordHash: null,
  });
}

const baseCallbacks = authConfig.callbacks ?? {};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...baseCallbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      if (!isVerifiedGoogleProfile(profile)) {
        return false;
      }

      const dbUser = await resolveGoogleUser(user);

      if (!dbUser) {
        return false;
      }

      user.id = dbUser.id;
      user.name = dbUser.name;
      user.email = dbUser.email;

      return true;
    },
    async jwt(params) {
      if (params.account?.provider === "google" && params.user?.email) {
        const dbUser = await getUserByEmail(params.user.email);

        if (dbUser) {
          params.token.sub = dbUser.id;
          params.token.name = dbUser.name;
          params.token.email = dbUser.email;

          return params.token;
        }
      }

      return baseCallbacks.jwt?.(params) ?? params.token;
    },
  },
  providers: [
    Google({}),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, request) {
        const rawEmail = `${credentials.email ?? ""}`;

        assertSignInAllowed(rawEmail, request);

        const parsedCredentials = signInSchema
          .pick({
            email: true,
            password: true,
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          recordSignInFailure(rawEmail, request);
          return null;
        }

        const { email, password } = parsedCredentials.data;
        const user = await getUserByEmail(email);

        if (!user) {
          recordSignInFailure(email, request);
          return null;
        }

        const passwordMatches = await verifyPassword(password, user.passwordHash);

        if (!passwordMatches) {
          recordSignInFailure(email, request);
          return null;
        }

        clearSignInFailures(email, request);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
});
