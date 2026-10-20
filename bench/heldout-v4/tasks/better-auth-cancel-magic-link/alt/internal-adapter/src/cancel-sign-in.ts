import type { DatabaseSync } from "node:sqlite";
import { createAuth } from "./auth.ts";

const silentMailer = { send: async () => {} };

/**
 * Backs GET /cancel-sign-in?token=… (the "Didn't ask for this?" link in our sign-in emails).
 * Returns true if a pending sign-in link was cancelled, false if there was none.
 */
export async function cancelSignInLink(db: DatabaseSync, token: string): Promise<boolean> {
  const ctx = await createAuth(db, silentMailer).$context;
  const identifier = `magic-link:${token}`;
  const pending = await ctx.internalAdapter.findVerificationValue(identifier);
  if (!pending) return false;
  await ctx.internalAdapter.deleteVerificationByIdentifier(identifier);
  return true;
}
