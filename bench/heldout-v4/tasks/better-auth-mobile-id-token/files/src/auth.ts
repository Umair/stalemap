import { betterAuth, type BetterAuthOptions } from "better-auth";
import { acme } from "./acme.ts";

export function createAuth(database: BetterAuthOptions["database"]) {
  return betterAuth({
    database,
    plugins: [
      acme({
        issuer: process.env.ACME_SSO_URL ?? "https://sso.acme.example",
        clientId: process.env.ACME_CLIENT_ID ?? "",
        clientSecret: process.env.ACME_CLIENT_SECRET ?? "",
      }),
    ],
  });
}
