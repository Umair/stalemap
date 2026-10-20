import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { memoryAdapter } from "better-auth/adapters/memory";

// A local stand-in for Acme SSO, behaving as docs/acme-sso.md describes.
const CLIENT_ID = "acme-client-1";
const CLIENT_SECRET = "acme-secret-1";
const codes = new Map<string, string>();
const rejected: string[] = [];

const json = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let body = "";
  for await (const chunk of req) body += chunk;
  if (req.method === "GET" && url.pathname === "/oauth/authorize") {
    const q = url.searchParams;
    if (q.has("code_challenge") || q.has("code_challenge_method")) {
      rejected.push("authorize: PKCE parameters");
      return json(res, 400, { error: "invalid_request", error_description: "PKCE is not supported" });
    }
    if (q.get("client_id") !== CLIENT_ID || q.get("response_type") !== "code" || !q.get("redirect_uri") || !q.get("state")) {
      rejected.push(`authorize: bad request ${url.search}`);
      return json(res, 400, { error: "invalid_request" });
    }
    const code = `code-${codes.size + 1}`;
    codes.set(code, q.get("redirect_uri")!);
    const back = new URL(q.get("redirect_uri")!);
    back.searchParams.set("code", code);
    back.searchParams.set("state", q.get("state")!);
    res.writeHead(302, { location: back.toString() });
    return res.end();
  }
  if (req.method === "POST" && url.pathname === "/oauth/token") {
    const form = new URLSearchParams(body);
    if (form.has("code_verifier")) {
      rejected.push("token: code_verifier");
      return json(res, 400, { error: "invalid_request", error_description: "PKCE is not supported" });
    }
    let id = form.get("client_id");
    let secret = form.get("client_secret");
    const basic = req.headers.authorization?.match(/^Basic\s+(.+)$/i);
    if (basic) [id, secret] = Buffer.from(basic[1], "base64").toString().split(":").map(decodeURIComponent);
    const code = form.get("code") ?? "";
    if (id !== CLIENT_ID || secret !== CLIENT_SECRET || form.get("grant_type") !== "authorization_code" || !codes.has(code)) {
      rejected.push("token: bad client or code");
      return json(res, 400, { error: "invalid_grant" });
    }
    codes.delete(code);
    return json(res, 200, { access_token: "acme-at-1", token_type: "Bearer", expires_in: 3600, scope: "profile email" });
  }
  if (req.method === "GET" && url.pathname === "/oauth/userinfo") {
    if (req.headers.authorization !== "Bearer acme-at-1") return json(res, 401, { error: "invalid_token" });
    return json(res, 200, { id: "u-1042", email: "kim.lee@acme.test", email_verified: true, name: "Kim Lee" });
  }
  json(res, 404, { error: "not_found" });
});

let auth: any;
let store: Record<string, any[]>;

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.ACME_SSO_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ACME_CLIENT_ID = CLIENT_ID;
  process.env.ACME_CLIENT_SECRET = CLIENT_SECRET;
  process.env.BETTER_AUTH_SECRET = "hidden-test-secret-0123456789-abcdefghijklmnop";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  const load = (id: string): Promise<any> => import(id);
  const { createAuth } = await load("../../src/auth.ts");
  store = { user: [], session: [], account: [], verification: [] };
  auth = createAuth(memoryAdapter(store));
});

after(() => server.close());

const cookiesFrom = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

test("signing in with Acme SSO creates the user and a session", async () => {
  const start: Response =
    typeof auth.api.signInWithOAuth2 === "function"
      ? await auth.api.signInWithOAuth2({ body: { providerId: "acme", callbackURL: "/dashboard" }, asResponse: true })
      : await auth.api.signInSocial({ body: { provider: "acme", callbackURL: "/dashboard" }, asResponse: true });
  assert.equal(start.status, 200);
  const { url } = (await start.json()) as { url: string };
  const stateCookie = cookiesFrom(start);

  const authorize = await fetch(url, { redirect: "manual" });
  assert.equal(authorize.status, 302, `Acme SSO refused the authorization request (${rejected.join("; ")})`);
  const callbackUrl = authorize.headers.get("location")!;

  const callback: Response = await auth.handler(new Request(callbackUrl, { headers: { cookie: stateCookie } }));
  assert.equal(callback.status, 302);
  assert.deepEqual(rejected, []);
  assert.equal(new URL(callback.headers.get("location")!, "http://localhost:3000").pathname, "/dashboard");

  const session = await auth.api.getSession({ headers: new Headers({ cookie: cookiesFrom(callback) }) });
  assert.equal(session?.user.email, "kim.lee@acme.test");
  assert.equal(session?.user.name, "Kim Lee");
  assert.equal(session?.user.emailVerified, true);

  const accounts = store.account.filter((a) => a.providerId === "acme");
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].accountId, "u-1042");
});
