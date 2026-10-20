import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { KvStore } from "./kv.ts";

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
        async consume(key, rule) {
          const count = await kv.incr(prefix + key, { ttlSeconds: rule.window });
          if (count <= rule.max) return { allowed: true, retryAfter: null };
          return { allowed: false, retryAfter: (await kv.ttl(prefix + key)) ?? rule.window };
        },
      },
    },
  });
}
