import type { Auth } from "./auth.ts";
import type { KvStore } from "./kv.ts";

export type SessionStatus = "active" | "signed-out" | "expired";

export interface SessionHistoryEntry {
  id: string;
  createdAt: Date;
  userAgent: string | null;
  status: SessionStatus;
}

/** Every session the user has had, newest first, for the "Where you're signed in" security page. */
export async function listSessionHistory(auth: Auth, kv: KvStore, userId: string): Promise<SessionHistoryEntry[]> {
  void auth;
  void kv;
  void userId;
  throw new Error("not implemented");
}
