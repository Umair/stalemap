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
  const { adapter } = await auth.$context;
  const rows = await adapter.findMany<Record<string, any>>({
    model: "session",
    where: [{ field: "userId", value: userId }],
    sortBy: { field: "createdAt", direction: "desc" },
  });
  const out: SessionHistoryEntry[] = [];
  for (const row of rows) {
    const ended = (await kv.get(`ended:${userId}:${row.token}`)) !== null;
    const expired = new Date(row.expiresAt) <= new Date();
    out.push({
      id: row.id,
      createdAt: new Date(row.createdAt),
      userAgent: row.userAgent ?? null,
      status: ended ? "signed-out" : expired ? "expired" : "active",
    });
  }
  return out;
}
