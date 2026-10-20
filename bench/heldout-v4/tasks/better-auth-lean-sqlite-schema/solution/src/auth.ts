import type { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";

/** The app's Better Auth instance, backed by our SQLite database. */
export function createAuth(db: DatabaseSync) {
  return betterAuth({
    database: db,
    emailAndPassword: { enabled: true },
    advanced: {
      // Our migrations own the tables and only create the columns we use.
      database: { validateSchema: false },
    },
  });
}
