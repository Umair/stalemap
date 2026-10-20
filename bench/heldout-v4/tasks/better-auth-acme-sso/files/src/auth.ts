import { betterAuth, type BetterAuthOptions } from "better-auth";

/** The app's Better Auth instance. Provider settings come from the environment (see .env.example). */
export function createAuth(database: BetterAuthOptions["database"]) {
  return betterAuth({
    database,
    emailAndPassword: { enabled: true },
  });
}
