import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { createUser, getUserByEmail } from "@/lib/data/users";
import { verifyPassword } from "@/lib/password";
import {
  assertSignInAllowed,
  clearSignInFailures,
  recordSignInFailure,
} from "@/lib/security/auth-guard";
import {
  getRequestContextFromHeaders,
  recordSecurityEvent,
} from "@/lib/security/audit";
import { resolveAppRoleForUser } from "@/lib/security/roles";
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
  image?: string | null;
}) {
  const email = normalizeEmail(input.email);

  if (!email) {
    return null;
  }

  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return existingUser;
  }

  return createUser({
    name: input.name?.trim() || fallbackNameFromEmail(email),
    email,
    image: input.image ?? null,
    passwordHash: null,
  });
}

const baseCallbacks = authConfig.callbacks ?? {};
const googleProvider =
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({})] : [];

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

      const appRole = await resolveAppRoleForUser(dbUser);
      user.id = dbUser.id;
      user.name = dbUser.name;
      user.email = dbUser.email;
      user.image = dbUser.image;
      user.role = appRole;
      user.mfaEnabled = dbUser.mfaEnabled;

      return true;
    },
    async jwt(params) {
      if (params.account?.provider === "google" && params.user?.email) {
        const dbUser = await getUserByEmail(params.user.email);

        if (dbUser) {
          const appRole = await resolveAppRoleForUser(dbUser);
          params.token.sub = dbUser.id;
          params.token.name = dbUser.name;
          params.token.email = dbUser.email;
          params.token.picture = dbUser.image ?? params.token.picture;
          params.token.role = appRole;
          params.token.mfaEnabled = dbUser.mfaEnabled;

          return params.token;
        }
      }

      return baseCallbacks.jwt?.(params) ?? params.token;
    },
  },
  providers: [
    ...googleProvider,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, request) {
        const rawEmail = `${credentials.email ?? ""}`;
        const context = getRequestContextFromHeaders(request.headers);

        try {
          assertSignInAllowed(rawEmail, request);
        } catch (error) {
          await recordSecurityEvent({
            email: rawEmail,
            type: "SIGN_IN_RATE_LIMITED",
            severity: "WARN",
            message: "Login bloqueado por excesso de tentativas.",
            context,
          });

          throw error;
        }

        const parsedCredentials = signInSchema
          .pick({
            email: true,
            password: true,
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          recordSignInFailure(rawEmail, request);
          await recordSecurityEvent({
            email: rawEmail,
            type: "SIGN_IN_VALIDATION_FAILED",
            severity: "WARN",
            message: parsedCredentials.error.issues[0]?.message ?? "Credenciais invalidas.",
            context,
          });
          return null;
        }

        const { email, password } = parsedCredentials.data;
        const user = await getUserByEmail(email);

        if (!user) {
          recordSignInFailure(email, request);
          await recordSecurityEvent({
            email,
            type: "SIGN_IN_FAILED",
            severity: "WARN",
            message: "Login falhou: usuario nao encontrado.",
            context,
          });
          return null;
        }

        const passwordMatches = await verifyPassword(password, user.passwordHash);

        if (!passwordMatches) {
          recordSignInFailure(email, request);
          await recordSecurityEvent({
            userId: user.id,
            email,
            type: "SIGN_IN_FAILED",
            severity: "WARN",
            message: "Login falhou: senha invalida.",
            context,
          });
          return null;
        }

        clearSignInFailures(email, request);
        await recordSecurityEvent({
          userId: user.id,
          email,
          type: "SIGN_IN_SUCCESS",
          severity: "INFO",
          message: "Login realizado com sucesso.",
          context,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: await resolveAppRoleForUser(user),
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
  ],
});
