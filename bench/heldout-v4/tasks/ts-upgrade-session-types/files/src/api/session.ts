/** What our API's /auth/token endpoint hands back for a signed-in user. */
export interface ApiSession {
  accessToken: string;
  /** When the access token stops working, in epoch milliseconds. */
  expires: number;
}

export function isExpired(session: Pick<ApiSession, "expires">, now = Date.now()): boolean {
  return session.expires <= now + 30_000;
}

export function authHeaders(session: Pick<ApiSession, "accessToken">): Record<string, string> {
  return { Authorization: `Bearer ${session.accessToken}` };
}
