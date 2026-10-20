import type { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins/magic-link";
import { APP_URL, type Mailer } from "./mailer.ts";

export function createAuth(db: DatabaseSync, mailer: Mailer) {
  return betterAuth({
    database: db,
    baseURL: APP_URL,
    plugins: [
      magicLink({
        expiresIn: 15 * 60,
        async sendMagicLink({ email, url, token }) {
          const cancelUrl = `${APP_URL}/cancel-sign-in?token=${encodeURIComponent(token)}`;
          await mailer.send({
            to: email,
            subject: "Your sign-in link",
            text: `Sign in: ${url}\n\nDidn't ask for this? Cancel the link: ${cancelUrl}`,
          });
        },
      }),
    ],
  });
}
