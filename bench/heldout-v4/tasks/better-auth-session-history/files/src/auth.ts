import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { KvStore } from "./kv.ts";

/**
 * Sessions are served from the key-value store; the database keeps a copy of every session
 * (including ended ones) for our security page and audits.
 */
export function createAuth({ database, kv }: { database: BetterAuthOptions["database"]; kv: KvStore }) {
  return betterAuth({
    database,
    secondaryStorage: kv,
    emailAndPassword: { enabled: true },
    session: {
      storeSessionInDatabase: true,
      preserveSessionInDatabase: true,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
