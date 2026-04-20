import type { NextAuthConfig } from "next-auth";

const protectedPrefixes = [
  "/dashboard",
  "/integrations",
  "/products",
  "/suppliers",
  "/orders",
  "/invoices",
  "/finance",
  "/tasks",
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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isProtectedRoute = protectedPrefixes.some(
        (prefix) =>
          nextUrl.pathname === prefix || nextUrl.pathname.startsWith(`${prefix}/`),
      );

      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
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
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name ?? "";
        session.user.email = token.email ?? "";
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
