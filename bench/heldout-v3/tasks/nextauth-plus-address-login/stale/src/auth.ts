import type { AuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { EmailConfig } from "next-auth/providers/email";
import { sendSignInEmail } from "./mailer.ts";

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
  // Same as next-auth's default normalizer, plus dropping a +tag.
  normalizeIdentifier(identifier: string): string {
    let [local, domain] = identifier.toLowerCase().trim().split("@");
    // The part before "@" can contain a ",", but we remove it on the domain part
    domain = domain.split(",")[0];
    local = local.split("+")[0];
    return `${local}@${domain}`;
  },
};

export function createAuthOptions(adapter: Adapter): AuthOptions {
  return {
    adapter,
    providers: [emailProvider],
    secret: process.env.NEXTAUTH_SECRET,
    pages: { verifyRequest: "/check-your-email" },
  };
}
