import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { genericOAuth } from "better-auth/plugins/generic-oauth";

export const db: Record<string, any[]> = { user: [], session: [], account: [], verification: [] };

export const auth = betterAuth({
  appName: "Shiftboard",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "shiftboard-dev-secret-change-me-0123456789",
  database: memoryAdapter(db),
  emailAndPassword: { enabled: true },
  socialProviders: {
    // Multi-tenant: any organization's work/school accounts plus personal Microsoft accounts.
    microsoft: {
      clientId: process.env.MS_CLIENT_ID ?? "",
      clientSecret: process.env.MS_CLIENT_SECRET ?? "",
      tenantId: "common",
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          // Our own staff directory (internal IdP).
          providerId: "staff",
          authorizationUrl: "https://sso.shiftboard.internal/oauth2/authorize",
          tokenUrl: "https://sso.shiftboard.internal/oauth2/token",
          userInfoUrl: "https://sso.shiftboard.internal/oauth2/userinfo",
          clientId: process.env.STAFF_CLIENT_ID ?? "shiftboard",
          clientSecret: process.env.STAFF_CLIENT_SECRET ?? "dev-staff-secret",
          scopes: ["openid", "profile", "email"],
        },
      ],
    }),
  ],
  logger: { disabled: true },
});
