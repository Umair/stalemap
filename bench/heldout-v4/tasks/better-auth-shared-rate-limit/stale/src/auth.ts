import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { KvStore } from "./kv.ts";

type RateLimitEntry = { key: string; count: number; lastRequest: number };

export function createAuth({ database, kv }: { database: BetterAuthOptions["database"]; kv: KvStore }) {
  const prefix = "rate-limit:";
  return betterAuth({
    database,
    emailAndPassword: { enabled: true },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 3 },
      },
      customStorage: {
        async get(key) {
          const raw = await kv.get(prefix + key);
          return raw ? (JSON.parse(raw) as RateLimitEntry) : undefined;
        },
        async set(key, value) {
          await kv.set(prefix + key, JSON.stringify(value), { ttlSeconds: 60 });
        },
      },
    },
  });
}
