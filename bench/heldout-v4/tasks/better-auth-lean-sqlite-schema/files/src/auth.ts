import type { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";

/** The app's Better Auth instance, backed by our SQLite database. */
export function createAuth(db: DatabaseSync) {
  void betterAuth;
  void db;
  throw new Error("not implemented");
}
