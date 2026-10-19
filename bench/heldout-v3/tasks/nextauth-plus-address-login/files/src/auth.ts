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
};

export function createAuthOptions(adapter: Adapter): AuthOptions {
  return {
    adapter,
    providers: [emailProvider],
    secret: process.env.NEXTAUTH_SECRET,
    pages: { verifyRequest: "/check-your-email" },
  };
}
