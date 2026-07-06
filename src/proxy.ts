import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe auth middleware. The `authorized` callback in authConfig gates
// /dashboard and redirects unauthenticated hosts to /login.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
