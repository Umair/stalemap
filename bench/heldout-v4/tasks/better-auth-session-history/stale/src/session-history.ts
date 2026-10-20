import type { Auth } from "./auth.ts";
import type { KvStore } from "./kv.ts";

export type SessionStatus = "active" | "signed-out" | "expired";

export interface SessionHistoryEntry {
  id: string;
  createdAt: Date;
  userAgent: string | null;
  status: SessionStatus;
}

type SessionRow = { id: string; token: string; createdAt: Date; expiresAt: Date; userAgent?: string | null };

/** Every session the user has had, newest first, for the "Where you're signed in" security page. */
export async function listSessionHistory(auth: Auth, kv: KvStore, userId: string): Promise<SessionHistoryEntry[]> {
  const ctx = await auth.$context;
  const rows = await ctx.adapter.findMany<SessionRow>({
    model: "session",
    where: [{ field: "userId", value: userId }],
  });
  const now = Date.now();
  const entries = await Promise.all(
    rows.map(async (row): Promise<SessionHistoryEntry> => {
      // Ended sessions stay in the database untouched; only the key-value store drops them on sign-out.
      let status: SessionStatus;
      if (new Date(row.expiresAt).getTime() <= now) status = "expired";
      else if (await kv.get(row.token)) status = "active";
      else status = "signed-out";
      return { id: row.id, createdAt: new Date(row.createdAt), userAgent: row.userAgent ?? null, status };
    }),
  );
  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
