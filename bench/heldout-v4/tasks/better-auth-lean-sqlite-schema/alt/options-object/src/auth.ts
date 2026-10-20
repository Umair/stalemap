import type { DatabaseSync } from "node:sqlite";
import { betterAuth, type BetterAuthOptions } from "better-auth";

const baseOptions = {
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
  advanced: {
    cookiePrefix: "app",
    database: {
      validateSchema: false,
    },
  },
} satisfies Omit<BetterAuthOptions, "database">;

export function createAuth(db: DatabaseSync) {
  const auth = betterAuth({ ...baseOptions, database: db });
  return auth;
}
