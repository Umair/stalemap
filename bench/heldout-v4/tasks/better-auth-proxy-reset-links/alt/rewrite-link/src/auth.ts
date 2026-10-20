import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { sendMail } from "./mailer.ts";

export const db: Record<string, any[]> = { user: [], session: [], account: [], verification: [] };

const STOREFRONTS = new Set(["shop.northwind.com", "shop.northwind.co.uk"]);
const DEFAULT_STOREFRONT = "shop.northwind.com";

/** Point a link better-auth generated at the storefront nginx says the customer is on. */
function onStorefront(link: string, request?: Request): string {
  const forwarded = request?.headers.get("x-forwarded-host")?.split(",")[0].trim().toLowerCase();
  const url = new URL(link);
  url.protocol = "https:";
  url.port = "";
  url.hostname = forwarded && STOREFRONTS.has(forwarded) ? forwarded : DEFAULT_STOREFRONT;
  return url.toString();
}

export const auth = betterAuth({
  appName: "Northwind Shop",
  baseURL: "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "northwind-dev-secret-change-me-0123456789",
  database: memoryAdapter(db),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }, request) => {
      await sendMail({ to: user.email, subject: "Reset your password", text: `Reset your password: ${onStorefront(url, request)}` });
    },
  },
  logger: { disabled: true },
});
