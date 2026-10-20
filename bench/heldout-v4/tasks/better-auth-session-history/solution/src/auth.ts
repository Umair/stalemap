import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { KvStore } from "./kv.ts";

export const signedOutKey = (sessionId: string) => `session-signed-out:${sessionId}`;

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
    databaseHooks: {
      session: {
        delete: {
          // Runs when a session is ended early (sign-out or revocation); the preserved row is marked ended.
          async after(session) {
            await kv.set(signedOutKey(session.id), new Date().toISOString());
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
