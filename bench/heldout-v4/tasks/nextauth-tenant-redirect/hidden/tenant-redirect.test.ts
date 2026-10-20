import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { before, test } from "node:test";
import { pathToFileURL } from "node:url";
const load = (id: string): Promise<any> => import(id);
// next-auth's exports map has no "./core"; load the request handler its route handlers call from the installed package.
const coreUrl = pathToFileURL(join(dirname(createRequire(import.meta.url).resolve("next-auth")), "core/index.js")).href;

before(() => {
  // The production deployment's environment.
  process.env.VERCEL = "1";
  process.env.NEXTAUTH_URL = "https://example.com";
  process.env.NEXTAUTH_SECRET = "hidden-test-secret-0123456789abcdef";
});

/** Signs Ada in on `host` through the credentials form, as the browser does, and returns where she is sent. */
async function signIn(host: string, callbackUrl: string): Promise<string> {
  const { AuthHandler } = await load(coreUrl);
  const { authOptions } = await load("../../src/auth.ts");
  const options = { ...authOptions, logger: { error() {}, warn() {}, debug() {} } };
  // Vercel's proxy forwards the visitor's host.
  const headers = { host: "localhost:3000", "x-forwarded-host": host, "x-forwarded-proto": "https" };
  const csrf = await AuthHandler({ req: new Request("http://localhost:3000/api/auth/csrf", { headers }), options });
  const cookie = csrf.cookies.find((c: { name: string }) => c.name.includes("csrf-token"));
  const body = JSON.stringify({ csrfToken: csrf.body.csrfToken, email: "ada@acme.test", password: "correct horse", callbackUrl, json: "true" });
  const res = await AuthHandler({
    req: new Request("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      body,
      headers: { ...headers, "content-type": "application/json", cookie: `${cookie.name}=${cookie.value}` },
    }),
    options,
  });
  const sessionCookie = (res.cookies ?? []).find((c: { name: string }) => c.name.includes("session-token"));
  assert.ok(sessionCookie?.value, "the sign-in succeeds");
  return String(res.redirect);
}
const isOurs = (href: string) => {
  const u = new URL(href);
  return u.protocol === "https:" && (u.hostname === "example.com" || u.hostname.endsWith(".example.com"));
};

test("users land back on the page they started from on their subdomain", async () => {
  assert.equal(await signIn("acme.example.com", "https://acme.example.com/dashboard"), "https://acme.example.com/dashboard");
  assert.equal(await signIn("globex.example.com", "https://globex.example.com/reports?tab=2"), "https://globex.example.com/reports?tab=2");
  assert.equal(await signIn("example.com", "https://example.com/pricing"), "https://example.com/pricing");
});

test("sign-in never redirects outside example.com and its subdomains", async () => {
  for (const target of ["https://evil.test/phish", "https://example.com.evil.test/x", "https://acme.example.com.evil.test/", "https://notexample.com/"]) {
    const where = await signIn("acme.example.com", target);
    assert.ok(isOurs(where), `${target} redirected to ${where}`);
  }
});
