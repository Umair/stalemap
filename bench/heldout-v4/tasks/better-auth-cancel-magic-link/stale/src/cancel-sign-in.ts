import type { DatabaseSync } from "node:sqlite";

/**
 * Backs GET /cancel-sign-in?token=… (the "Didn't ask for this?" link in our sign-in emails).
 * Returns true if a pending sign-in link was cancelled, false if there was none.
 */
export function cancelSignInLink(db: DatabaseSync, token: string): boolean {
  const result = db.prepare(`delete from "verification" where "identifier" = ?`).run(token);
  return Number(result.changes) > 0;
}
