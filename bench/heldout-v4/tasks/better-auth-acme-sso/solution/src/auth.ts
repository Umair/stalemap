import { betterAuth, type BetterAuthOptions } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

/** The app's Better Auth instance. Provider settings come from the environment (see .env.example). */
export function createAuth(database: BetterAuthOptions["database"]) {
  const acmeUrl = process.env.ACME_SSO_URL!;
  return betterAuth({
    database,
    emailAndPassword: { enabled: true },
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "acme",
            clientId: process.env.ACME_CLIENT_ID!,
            clientSecret: process.env.ACME_CLIENT_SECRET!,
            authorizationUrl: `${acmeUrl}/oauth/authorize`,
            tokenUrl: `${acmeUrl}/oauth/token`,
            userInfoUrl: `${acmeUrl}/oauth/userinfo`,
            scopes: ["profile", "email"],
            // Acme SSO rejects PKCE parameters.
            pkce: false,
          },
        ],
      }),
    ],
  });
}
