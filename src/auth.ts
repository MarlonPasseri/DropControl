import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getUserByEmail } from "@/lib/data/users";
import { verifyPassword } from "@/lib/password";
import {
  assertSignInAllowed,
  clearSignInFailures,
  recordSignInFailure,
} from "@/lib/security/auth-guard";
import { signInSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
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
