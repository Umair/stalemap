import { signedOutKey, type Auth } from "./auth.ts";
import type { KvStore } from "./kv.ts";

export type SessionStatus = "active" | "signed-out" | "expired";

export interface SessionHistoryEntry {
  id: string;
  createdAt: Date;
  userAgent: string | null;
  status: SessionStatus;
}

type SessionRow = { id: string; createdAt: Date; expiresAt: Date; userAgent?: string | null };

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
      let status: SessionStatus;
      if (await kv.get(signedOutKey(row.id))) status = "signed-out";
      else if (new Date(row.expiresAt).getTime() <= now) status = "expired";
      else status = "active";
      return { id: row.id, createdAt: new Date(row.createdAt), userAgent: row.userAgent ?? null, status };
    }),
  );
  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
