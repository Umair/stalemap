import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

process.env.BETTER_AUTH_SECRET ??= "hidden-test-secret-0123456789-abcdefghijklmnop";

const load = (id: string): Promise<any> => import(id);
const { createAuth } = await load("../../src/auth.ts");
const { cancelSignInLink } = await load("../../src/cancel-sign-in.ts");
const { SCHEMA } = await load("../../src/db.ts");

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec("pragma foreign_keys = on");
  db.exec(SCHEMA);
  const sent: { to: string; text: string }[] = [];
  const auth = createAuth(db, { send: async (mail: { to: string; text: string }) => void sent.push(mail) });
  const requestLink = async (email: string) => {
    await auth.api.signInMagicLink({ body: { email, callbackURL: "/home" }, headers: new Headers() });
    const mail = sent.filter((m) => m.to === email).at(-1)!;
    const url = new URL(mail.text.match(/Sign in: (\S+)/)![1]);
    return { token: url.searchParams.get("token")!, url };
  };
  const signsIn = async (url: URL) => {
    const res: Response = await auth.handler(new Request(url));
    const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    if (!cookie) return false;
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    return Boolean(session?.user);
  };
  return { db, auth, requestLink, signsIn };
}

test("a cancelled sign-in link no longer signs anyone in", async () => {
  const { db, requestLink, signsIn } = setup();
  const { token, url } = await requestLink("ada@example.com");
  assert.equal(await cancelSignInLink(db, token), true);
  assert.equal(await signsIn(url), false);
});

test("cancelling an unknown or already cancelled token returns false", async () => {
  const { db, requestLink } = setup();
  const { token } = await requestLink("ada@example.com");
  assert.equal(await cancelSignInLink(db, "no-such-token"), false);
  assert.equal(await cancelSignInLink(db, token), true);
  assert.equal(await cancelSignInLink(db, token), false);
});

test("other people's links keep working", async () => {
  const { db, requestLink, signsIn } = setup();
  const ada = await requestLink("ada@example.com");
  const bo = await requestLink("bo@example.com");
  assert.equal(await cancelSignInLink(db, ada.token), true);
  assert.equal(await signsIn(bo.url), true);
});

test("an uncancelled link signs in", async () => {
  const { requestLink, signsIn } = setup();
  const { url } = await requestLink("cy@example.com");
  assert.equal(await signsIn(url), true);
});
