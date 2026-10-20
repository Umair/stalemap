import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { memoryAdapter } from "better-auth/adapters/memory";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const CLIENT_ID = "acme-mobile-backend";
const acmeKey = await generateKeyPair("RS256");
const strangerKey = await generateKeyPair("RS256");
const publicJwk = { ...(await exportJWK(acmeKey.publicKey)), kid: "acme-1", alg: "RS256", use: "sig" };

const server = http.createServer((req, res) => {
  if (req.url === "/.well-known/jwks.json") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ keys: [publicJwk] }));
  }
  res.writeHead(404);
  res.end();
});

let issuer = "";
let auth: any;
let store: Record<string, any[]>;

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ACME_SSO_URL = issuer;
  process.env.ACME_CLIENT_ID = CLIENT_ID;
  process.env.ACME_CLIENT_SECRET = "acme-secret";
  process.env.BETTER_AUTH_SECRET = "hidden-test-secret-0123456789-abcdefghijklmnop";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  const load = (id: string): Promise<any> => import(id);
  const { createAuth } = await load("../../src/auth.ts");
  store = { user: [], session: [], account: [], verification: [] };
  auth = createAuth(memoryAdapter(store));
});

after(() => server.close());

const claims = { email: "kim.lee@acme.test", email_verified: true, name: "Kim Lee" };

function idToken(overrides: { key?: CryptoKey; iss?: string; aud?: string; sub?: string } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "acme-1" })
    .setSubject(overrides.sub ?? "acme|1042")
    .setIssuer(overrides.iss ?? issuer)
    .setAudience(overrides.aud ?? CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(overrides.key ?? acmeKey.privateKey);
}

/** What the mobile app sends: POST /sign-in/social { provider: "acme", idToken: { token } }. */
async function mobileSignIn(token: string) {
  const res: Response = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ provider: "acme", idToken: { token } }),
    }),
  );
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const session = cookie ? await auth.api.getSession({ headers: new Headers({ cookie }) }) : null;
  return { status: res.status, session };
}

test("a genuine Acme id_token signs the user in", async () => {
  const { status, session } = await mobileSignIn(await idToken());
  assert.equal(status, 200);
  assert.equal(session?.user.email, "kim.lee@acme.test");
  assert.equal(session?.user.name, "Kim Lee");
  const accounts = store.account.filter((a) => a.providerId === "acme");
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].accountId, "acme|1042");
});

test("a token signed with another key is rejected", async () => {
  const { session } = await mobileSignIn(await idToken({ key: strangerKey.privateKey, sub: "acme|9" }));
  assert.equal(session, null);
});

test("a token for another client or from another issuer is rejected", async () => {
  assert.equal((await mobileSignIn(await idToken({ aud: "someone-else", sub: "acme|10" }))).session, null);
  assert.equal((await mobileSignIn(await idToken({ iss: "https://evil.example", sub: "acme|11" }))).session, null);
  assert.equal(store.account.filter((a) => a.providerId === "acme" && a.accountId !== "acme|1042").length, 0);
});
