import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";
const load = (id: string): Promise<any> => import(id);
// next-auth's exports map has no "./core"; load its request handler from the installed package directly.
const coreUrl = pathToFileURL(join(dirname(createRequire(import.meta.url).resolve("next-auth")), "core/index.js")).href;

const mail: string[] = [];
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    mail.push(JSON.parse(body).to);
    res.writeHead(200, { "content-type": "application/json" }).end("{}");
  });
});
before(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.MAIL_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/send`;
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.NEXTAUTH_SECRET = "hidden-test-secret-0123456789";
});
after(() => server.close());

async function signIn(email: string) {
  const { AuthHandler } = await load(coreUrl);
  const { createAuthOptions } = await load("../../src/auth.ts");
  const lookedUp: string[] = [];
  const adapter = {
    getUserByEmail: async (e: string) => (lookedUp.push(e), null),
    createVerificationToken: async (t: unknown) => t,
    useVerificationToken: async () => null,
  };
  const options = { ...createAuthOptions(adapter), logger: { error() {}, warn() {}, debug() {} } };
  const origin = "http://localhost:3000";
  const csrf = await AuthHandler({ req: { action: "csrf", method: "GET", origin }, options });
  const cookie = csrf.cookies.find((c: { name: string }) => c.name.includes("csrf-token"));
  mail.length = 0;
  const res = await AuthHandler({
    req: { action: "signin", providerId: "email", method: "POST", origin, cookies: { [cookie.name]: cookie.value }, body: { email, csrfToken: csrf.body.csrfToken } },
    options,
  });
  return { redirect: String(res.redirect), sentTo: [...mail], lookedUp };
}

test("plain addresses are lower-cased and trimmed", async () => {
  const r = await signIn("  Ada.Lovelace@Example.COM ");
  assert.deepEqual(r.sentTo, ["ada.lovelace@example.com"]);
  assert.doesNotMatch(r.redirect, /error=/);
});

test("a +tag is dropped from the identifier", async () => {
  const r = await signIn("ada+shop@example.com");
  assert.deepEqual(r.sentTo, ["ada@example.com"]);
  assert.deepEqual(r.lookedUp, ["ada@example.com"]);
  assert.deepEqual((await signIn("Grace+Work+2@Example.org")).sentTo, ["grace@example.org"]);
});

test("addresses typed in full-width characters are normalized as by next-auth", async () => {
  assert.deepEqual((await signIn("ａｄａ＠ｅｘａｍｐｌｅ．ｃｏｍ")).sentTo, ["ada@example.com"]);
  assert.deepEqual((await signIn("ＢＯＢ@example.com")).sentTo, ["bob@example.com"]);
});

test("look-alike @ signs are rejected as by next-auth", async () => {
  for (const email of ["ada@example.com＠evil.example", "ada@example.com﹫evil.example"]) {
    const r = await signIn(email);
    assert.deepEqual(r.sentTo, [], `no link is sent for ${email}`);
    assert.match(r.redirect, /error=EmailSignin/);
  }
});
