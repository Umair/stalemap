import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { KvStore } from "./kv.ts";

/**
 * Sessions are served from the key-value store; the database keeps a copy of every session
 * (including ended ones) for our security page and audits.
 */
export function createAuth({ database, kv }: { database: BetterAuthOptions["database"]; kv: KvStore }) {
  const options = {
    database,
    secondaryStorage: kv,
    emailAndPassword: { enabled: true },
    session: {
      storeSessionInDatabase: true,
      preserveSessionInDatabase: true,
    },
    databaseHooks: {
      session: {
        delete: {
          async before(session: { token: string; userId: string }) {
            await kv.set(`ended:${session.userId}:${session.token}`, "1");
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
  return betterAuth(options);
}

export type Auth = ReturnType<typeof createAuth>;
