import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { KvStore } from "./kv.ts";

export function createAuth({ database, kv }: { database: BetterAuthOptions["database"]; kv: KvStore }) {
  void kv;
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
    },
  });
}
