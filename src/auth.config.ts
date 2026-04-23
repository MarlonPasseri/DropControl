import type { NextAuthConfig } from "next-auth";
import { hasVerifiedMfaCookie, isMfaRequired } from "@/lib/security/mfa";

const protectedPrefixes = [
  "/dashboard",
  "/integrations",
  "/products",
  "/suppliers",
  "/orders",
  "/invoices",
  "/finance",
  "/tasks",
  "/security",
  "/profile",
];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnMfaChallenge = nextUrl.pathname === "/login/mfa";
      const isProtectedRoute = protectedPrefixes.some(
        (prefix) =>
          nextUrl.pathname === prefix || nextUrl.pathname.startsWith(`${prefix}/`),
      );
      const requiresMfa =
        isLoggedIn &&
        isMfaRequired(auth.user) &&
        !hasVerifiedMfaCookie(request.cookies, auth.user.id);

      if (isOnMfaChallenge) {
        return isLoggedIn;
      }

      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL(requiresMfa ? "/login/mfa" : "/dashboard", nextUrl));
      }

      if (requiresMfa && !isOnMfaChallenge) {
        const redirectUrl = new URL("/login/mfa", nextUrl);
        redirectUrl.searchParams.set(
          "callbackUrl",
          `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
        );

        return Response.redirect(redirectUrl);
      }

      if (isProtectedRoute) {
        return isLoggedIn;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.role = user.role;
        token.mfaEnabled = user.mfaEnabled;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name ?? "";
        session.user.email = token.email ?? "";
        session.user.image =
          typeof token.picture === "string" ? token.picture : session.user.image ?? null;
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "OPERATOR";
        session.user.mfaEnabled = token.mfaEnabled === true;
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
