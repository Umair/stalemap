import { betterAuth, type BetterAuthOptions } from "better-auth";
import { genericOAuth, type GenericOAuthConfig } from "better-auth/plugins";

type AcmeProfile = { id: string; email: string; email_verified: boolean; name: string };

function acmeProvider(baseUrl: string): GenericOAuthConfig {
  return {
    providerId: "acme",
    clientId: process.env.ACME_CLIENT_ID ?? "",
    clientSecret: process.env.ACME_CLIENT_SECRET ?? "",
    authorizationUrl: new URL("/oauth/authorize", baseUrl).toString(),
    tokenUrl: new URL("/oauth/token", baseUrl).toString(),
    scopes: ["profile", "email"],
    pkce: false,
    authentication: "basic",
    async getUserInfo(tokens) {
      const res = await fetch(new URL("/oauth/userinfo", baseUrl), {
        headers: { authorization: `Bearer ${tokens.accessToken}` },
      });
      if (!res.ok) return null;
      const p = (await res.json()) as AcmeProfile;
      return { id: p.id, email: p.email, emailVerified: p.email_verified, name: p.name };
    },
  };
}

export function createAuth(database: BetterAuthOptions["database"]) {
  const baseUrl = process.env.ACME_SSO_URL ?? "https://sso.acme.example";
  return betterAuth({
    database,
    emailAndPassword: { enabled: true },
    plugins: [genericOAuth({ config: [acmeProvider(baseUrl)] })],
  });
}
