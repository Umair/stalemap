import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { memoryAdapter } from "better-auth/adapters/memory";

process.env.BETTER_AUTH_SECRET ??= "hidden-test-secret-0123456789-abcdefghijklmnop";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

const load = (id: string): Promise<any> => import(id);
const { createAuth } = await load("../../src/auth.ts");
const { createMemoryKv } = await load("../../src/kv.ts");
const { listSessionHistory } = await load("../../src/session-history.ts");

const cookiesFrom = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

test("sessions are listed newest first as active, signed-out or expired", async () => {
  const store: Record<string, any[]> = { user: [], session: [], account: [], verification: [] };
  const kv = createMemoryKv();
  const auth = createAuth({ database: memoryAdapter(store), kv });
  const credentials = { email: "ada@example.com", password: "correct horse battery" };

  const signIn = async (userAgent: string) => {
    await sleep(15);
    const res: Response = await auth.api.signInEmail({ body: credentials, headers: new Headers({ "user-agent": userAgent }), asResponse: true });
    assert.equal(res.status, 200);
    const { token } = (await res.json()) as { token: string };
    return { token, cookie: cookiesFrom(res) };
  };

  const { user } = await auth.api.signUpEmail({ body: { name: "Ada", ...credentials } });
  const laptop = await signIn("laptop");
  const phone = await signIn("phone");
  const tablet = await signIn("tablet");
  const kiosk = await signIn("kiosk");

  // The phone signs out; the tablet is revoked from the laptop; the kiosk session runs out.
  await auth.api.signOut({ headers: new Headers({ cookie: phone.cookie }) });
  await auth.api.revokeSession({ body: { token: tablet.token }, headers: new Headers({ cookie: laptop.cookie }) });
  const kioskRow = store.session.find((s) => s.token === kiosk.token)!;
  kioskRow.expiresAt = new Date(Date.now() - 60_000);
  await kv.delete(kiosk.token);

  const idOf = (token: string) => store.session.find((s) => s.token === token)!.id as string;
  const history = await listSessionHistory(auth, kv, user.id);
  const statusById = Object.fromEntries(history.map((e: { id: string; status: string }) => [e.id, e.status]));

  assert.equal(statusById[idOf(laptop.token)], "active");
  assert.equal(statusById[idOf(phone.token)], "signed-out");
  assert.equal(statusById[idOf(tablet.token)], "signed-out");
  assert.equal(statusById[idOf(kiosk.token)], "expired");

  const order = history.map((e: { id: string }) => e.id);
  const kioskAt = order.indexOf(idOf(kiosk.token));
  const laptopAt = order.indexOf(idOf(laptop.token));
  assert.ok(kioskAt >= 0 && laptopAt > kioskAt, "newest first");
  assert.ok(order.indexOf(idOf(phone.token)) < laptopAt && order.indexOf(idOf(tablet.token)) < order.indexOf(idOf(phone.token)));
  const kioskEntry = history.find((e: { id: string }) => e.id === idOf(kiosk.token));
  assert.equal(kioskEntry.userAgent, "kiosk");

  // The other sessions still work as before.
  const laptopSession = await auth.api.getSession({ headers: new Headers({ cookie: laptop.cookie }) });
  assert.equal(laptopSession?.user.id, user.id);
  assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: phone.cookie }) }), null);
});
