import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { sendMail } from "./mailer.ts";

export const db: Record<string, any[]> = { user: [], session: [], account: [], verification: [] };

export const auth = betterAuth({
  appName: "Northwind Shop",
  baseURL: "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "northwind-dev-secret-change-me-0123456789",
  database: memoryAdapter(db),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({ to: user.email, subject: "Reset your password", text: `Reset your password: ${url}` });
    },
  },
  logger: { disabled: true },
});
