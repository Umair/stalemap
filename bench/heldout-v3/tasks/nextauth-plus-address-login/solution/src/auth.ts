import type { AuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { EmailConfig } from "next-auth/providers/email";
import { sendSignInEmail } from "./mailer.ts";

/** next-auth's built-in identifier normalization, plus dropping a +tag from the local part. */
export function normalizeEmail(identifier: string): string {
  const trimmed = identifier.normalize("NFKC").trim();
  if ((trimmed.match(/@/g) ?? []).length !== 1 || trimmed.includes('"')) throw new Error("Invalid email address format.");
  let [local, domain] = trimmed.toLowerCase().split("@");
  if (!local || !domain) throw new Error("Invalid email address format.");
  domain = domain.split(",")[0];
  if (!domain.includes(".")) throw new Error("Invalid email address format.");
  local = local.split("+")[0];
  if (!local) throw new Error("Invalid email address format.");
  return `${local}@${domain}`;
}

/** Magic-link sign-in. Mail goes out through our HTTP mail API, so there's no SMTP server (and no nodemailer). */
export const emailProvider: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  server: {},
  from: "Acme <login@acme.test>",
  maxAge: 24 * 60 * 60,
  options: {},
  sendVerificationRequest: ({ identifier, url }) => sendSignInEmail(identifier, url),
  normalizeIdentifier: normalizeEmail,
};

export function createAuthOptions(adapter: Adapter): AuthOptions {
  return {
    adapter,
    providers: [emailProvider],
    secret: process.env.NEXTAUTH_SECRET,
    pages: { verifyRequest: "/check-your-email" },
  };
}
