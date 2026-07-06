import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { createTransport } from "nodemailer";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "@/auth.config";

const smtpConfigured = Boolean(process.env.EMAIL_SERVER || process.env.EMAIL_SERVER_HOST);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // JWT sessions keep the edge middleware DB-free; the adapter is only used
  // to store users and magic-link verification tokens.
  session: { strategy: "jwt" },
  providers: [
    Nodemailer({
      // Placeholder satisfies the provider's validation; it's only actually
      // used when SMTP is configured (see sendVerificationRequest below).
      server: process.env.EMAIL_SERVER || "smtp://user:pass@localhost:587",
      from: process.env.EMAIL_FROM ?? "once more <onboarding@resend.dev>",
      async sendVerificationRequest({ identifier, url, provider }) {
        // Zero-config dev fallback: if no SMTP is set, log the link so you can
        // sign in locally without email infrastructure.
        if (!smtpConfigured) {
          console.log("\n🎞  once-more magic link for", identifier);
          console.log("   ", url, "\n");
          return;
        }

        const transport = createTransport(provider.server);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "Your once more sign-in link",
          text: `Sign in to once more:\n${url}\n\nIf you didn't request this, ignore this email.`,
          html: `<p>Sign in to <b>once more</b>:</p><p><a href="${url}">Open once more</a></p><p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>`,
        });
      },
    }),
  ],
});
