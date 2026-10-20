import assert from "node:assert/strict";
import { test } from "node:test";
import type { Session } from "next-auth";

type IsAny<T> = 0 extends 1 & T ? true : false;
// The session type still carries the API token for the TypeScript code (a string, not any) and keeps next-auth's expiry.
const tokenNotAny: IsAny<Session["accessToken"]> = false;
const tokenIsString: string | undefined = ({} as Session).accessToken;
const expiresIsIsoString: string = ({} as Session).expires;
void [tokenNotAny, tokenIsString, expiresIsIsoString];

const load = (id: string): Promise<any> => import(id);

test("the session callback copies the API token into the session", async () => {
  const { authOptions } = await load("../../src/auth.ts");
  const token = await authOptions.callbacks.jwt({
    token: { sub: "u1", email: "ada@example.com" },
    user: { id: "u1", email: "ada@example.com", accessToken: "tok-123", accessTokenExpires: 1_900_000_000_000 },
  });
  assert.equal(token.accessToken, "tok-123");
  const session = await authOptions.callbacks.session({
    session: { user: { email: "ada@example.com" }, expires: "2026-11-01T00:00:00.000Z" },
    token,
  });
  assert.equal(session.accessToken, "tok-123");
  assert.equal(session.expires, "2026-11-01T00:00:00.000Z");
});

test("API headers use the session's token until it expires", async () => {
  const { apiHeaders } = await load("../../src/auth.ts");
  const session = { user: { email: "ada@example.com" }, expires: "2026-11-01T00:00:00.000Z", accessToken: "tok-123" };
  assert.deepEqual(apiHeaders(session, 2_000_000, 1_000_000), { Authorization: "Bearer tok-123" });
  assert.equal(apiHeaders(session, 1_010_000, 1_000_000), undefined);
  assert.equal(apiHeaders({ ...session, accessToken: "" }, 2_000_000, 1_000_000), undefined);
});
