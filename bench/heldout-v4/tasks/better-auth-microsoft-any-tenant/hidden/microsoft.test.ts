import assert from "node:assert/strict";
import { before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);
let auth: any;

before(async () => {
  process.env.MS_CLIENT_ID = "3f1c9a52-ms-client";
  process.env.MS_CLIENT_SECRET = "ms-secret-value";
  ({ auth } = await load("../../src/auth.ts"));
});

async function post(path: string, body: unknown): Promise<{ status: number; url?: string }> {
  const res: Response = await auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const data = (await res.json().catch(() => ({}))) as { url?: string };
  return { status: res.status, url: data.url };
}

/** The authorize URL the login page's "Sign in with Microsoft" button leads to, whichever way it's wired. */
async function startSignIn(host: string): Promise<URL | undefined> {
  for (const id of ["microsoft", "microsoft-entra-id", "microsoft-entra", "azure", "entra", "entra-id", "azure-ad"]) {
    for (const [path, body] of [
      ["/sign-in/social", { provider: id, callbackURL: "/schedule" }],
      ["/sign-in/oauth2", { providerId: id, callbackURL: "/schedule" }],
    ] as const) {
      const { status, url } = await post(path, body);
      if (status === 200 && url && new URL(url).host === host) return new URL(url);
    }
  }
  return undefined;
}

test("Microsoft sign-in accepts accounts from any tenant", async () => {
  const url = await startSignIn("login.microsoftonline.com");
  assert.ok(url, "no Microsoft sign-in could be started");
  assert.match(url.pathname, /^\/common\/oauth2\/v2\.0\/authorize$/);
  assert.equal(url.searchParams.get("client_id"), "3f1c9a52-ms-client");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(new URL(url.searchParams.get("redirect_uri") ?? "").origin, "http://localhost:3000");
});

test("staff sign-in still starts", async () => {
  const url = await startSignInStaff();
  assert.ok(url, "staff sign-in could not be started");
});

async function startSignInStaff(): Promise<URL | undefined> {
  for (const [path, body] of [
    ["/sign-in/social", { provider: "staff", callbackURL: "/schedule" }],
    ["/sign-in/oauth2", { providerId: "staff", callbackURL: "/schedule" }],
  ] as const) {
    const { status, url } = await post(path, body);
    if (status === 200 && url && new URL(url).host === "sso.shiftboard.internal") return new URL(url);
  }
  return undefined;
}
