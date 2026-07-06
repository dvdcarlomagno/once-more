import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config used by proxy.ts (middleware). No adapter, no DB driver,
 * no nodemailer here — only what the edge runtime can run.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check=1",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
      if (isDashboard) return !!auth?.user;
      return true;
    },
  },
} satisfies NextAuthConfig;
