import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { KvStore } from "./kv.ts";

export function createAuth({ database, kv }: { database: BetterAuthOptions["database"]; kv: KvStore }) {
  return betterAuth({
    database,
    secondaryStorage: {
      get: (key) => kv.get(key),
      set: (key, value, ttl) => kv.set(key, value, ttl ? { ttlSeconds: ttl } : undefined),
      delete: (key) => kv.del(key),
      increment: (key, ttl) => kv.incr(key, { ttlSeconds: ttl }),
      async getAndDelete(key) {
        const value = await kv.get(key);
        if (value !== null) await kv.del(key);
        return value;
      },
    },
    session: { storeSessionInDatabase: true },
    emailAndPassword: { enabled: true },
    rateLimit: {
      enabled: true,
      storage: "secondary-storage",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 3 },
      },
    },
  });
}
