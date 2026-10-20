import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

// In-memory store for now; we'll move to Postgres before launch.
export const db: Record<string, any[]> = { user: [], session: [], account: [], verification: [] };

export const auth = betterAuth({
  appName: "Pantry",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "pantry-dev-secret-change-me-0123456789",
  database: memoryAdapter(db),
  emailAndPassword: { enabled: true },
  logger: { disabled: true },
});
