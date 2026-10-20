import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);
const seen: { headers: http.IncomingHttpHeaders; body: URLSearchParams }[] = [];
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = new URLSearchParams(raw);
    seen.push({ headers: req.headers, body });
    if (req.method !== "POST" || req.url !== "/oauth2/token" || req.headers["x-egress-client"] !== "northwind-web") {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "access_denied" }));
      return;
    }
    const grant = body.get("grant_type");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        token_type: "Bearer",
        access_token: grant === "refresh_token" ? "at-refreshed" : "at-initial",
        refresh_token: grant === "refresh_token" ? "rt-rotated" : "rt-initial",
        expires_in: 3600,
        scope: "openid profile email",
        id_token: "header.payload.signature",
      }),
    );
  });
});

let mod: any;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.ACME_ISSUER = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  mod = await load("../../src/acme-tokens.ts");
});
after(() => server.close());

const basic = `Basic ${Buffer.from("northwind-web:dev-acme-secret").toString("base64")}`;

test("exchanges an authorization code through the gateway", async () => {
  seen.length = 0;
  const started = Date.now();
  const tokens = await mod.exchangeCode("code-123", "https://shop.northwind.com/api/auth/callback/acme", "verifier-abc");
  assert.equal(seen.length, 1);
  const { headers, body } = seen[0];
  assert.equal(headers["x-egress-client"], "northwind-web");
  assert.equal(headers.authorization, basic);
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("code"), "code-123");
  assert.equal(body.get("redirect_uri"), "https://shop.northwind.com/api/auth/callback/acme");
  assert.equal(body.get("code_verifier"), "verifier-abc");
  assert.equal(body.get("client_secret"), null, "the secret goes in Basic auth, not the body");
  assert.equal(tokens.accessToken, "at-initial");
  assert.equal(tokens.refreshToken, "rt-initial");
  assert.equal(tokens.idToken, "header.payload.signature");
  assert.ok(tokens.accessTokenExpiresAt instanceof Date);
  const ttl = tokens.accessTokenExpiresAt.getTime() - started;
  assert.ok(ttl > 3500_000 && ttl < 3700_000, `expiry is ${ttl} ms away`);
});

test("refreshes tokens through the gateway", async () => {
  seen.length = 0;
  const tokens = await mod.refreshTokens("rt-initial");
  assert.equal(seen.length, 1);
  const { headers, body } = seen[0];
  assert.equal(headers["x-egress-client"], "northwind-web");
  assert.equal(headers.authorization, basic);
  assert.equal(body.get("grant_type"), "refresh_token");
  assert.equal(body.get("refresh_token"), "rt-initial");
  assert.equal(tokens.accessToken, "at-refreshed");
  assert.equal(tokens.refreshToken, "rt-rotated");
  assert.ok(tokens.accessTokenExpiresAt instanceof Date);
});
