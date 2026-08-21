import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { accounts, sessions, users, verifications } from "@/lib/db/schema";

function requireEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and EMAIL_FROM must be configured for email authentication.");
  return { from, resend: new Resend(apiKey) };
}

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "development-only-secret-replace-before-production",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  socialProviders: googleConfigured
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" } }
    : {},
  emailVerification: { sendOnSignUp: true },
  plugins: [
    magicLink({
      expiresIn: 10 * 60,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        const { resend, from } = requireEmailConfig();
        const { error } = await resend.emails.send({
          from,
          to: email,
          subject: "Tu acceso a ANC Tickets",
          html: `<p>Usa este enlace seguro para acceder a ANC Tickets:</p><p><a href="${url}">Iniciar sesión</a></p><p>Este enlace expira en 10 minutos.</p>`,
          headers: { "Resend-Idempotency-Key": `anc-auth/${Buffer.from(url).toString("base64url")}` },
        });
        if (error) throw new Error("Resend rejected the Magic Link email.");
      },
    }),
    nextCookies(),
  ],
});
