import assert from "node:assert/strict";
import { test } from "node:test";
import { memoryAdapter } from "better-auth/adapters/memory";

process.env.BETTER_AUTH_SECRET ??= "hidden-test-secret-0123456789-abcdefghijklmnop";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

const load = (id: string): Promise<any> => import(id);
const { createAuth } = await load("../../src/auth.ts");
const { createMemoryKv } = await load("../../src/kv.ts");

/** Two API instances sharing one database and one key-value store, as in production. */
async function cluster() {
  const store = { user: [], session: [], account: [], verification: [], rateLimit: [] };
  const kv = createMemoryKv();
  let kvCalls = 0;
  const counted = Object.fromEntries(
    Object.entries(kv).map(([name, fn]) => [name, (...args: unknown[]) => (kvCalls++, (fn as (...a: unknown[]) => unknown)(...args))]),
  );
  const instances = [createAuth({ database: memoryAdapter(store), kv: counted }), createAuth({ database: memoryAdapter(store), kv: counted })];
  await instances[0].api.signUpEmail({ body: { name: "Ada", email: "ada@example.com", password: "correct horse battery" } });
  return { instances, kvCalls: () => kvCalls };
}

const signIn = (auth: any, ip: string, password = "wrong password!") =>
  auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": ip },
      body: JSON.stringify({ email: "ada@example.com", password }),
    }),
  ) as Promise<Response>;

test("the sign-in limit holds across instances", async () => {
  const { instances, kvCalls } = await cluster();
  const statuses: number[] = [];
  for (let i = 0; i < 3; i++) statuses.push((await signIn(instances[i % 2], "203.0.113.7")).status);
  assert.ok(statuses.every((s) => s !== 429 && s < 500), `first three attempts are let through (got ${statuses})`);
  assert.equal(statuses[0], 401);

  const blocked = await signIn(instances[1], "203.0.113.7", "correct horse battery");
  assert.equal(blocked.status, 429, "the fourth attempt within the window is limited, on whichever instance it lands");
  const retryAfter = Number(blocked.headers.get("x-retry-after"));
  assert.ok(retryAfter > 0 && retryAfter <= 60, `X-Retry-After is within the window (got ${blocked.headers.get("x-retry-after")})`);
  assert.equal((await signIn(instances[0], "203.0.113.7", "correct horse battery")).status, 429);
  assert.ok(kvCalls() > 0, "the counters live in the shared store");
});

test("other clients and a successful sign-in are unaffected", async () => {
  const { instances } = await cluster();
  for (let i = 0; i < 3; i++) await signIn(instances[i % 2], "203.0.113.7");
  const other = await signIn(instances[1], "198.51.100.20", "correct horse battery");
  assert.equal(other.status, 200);
});
