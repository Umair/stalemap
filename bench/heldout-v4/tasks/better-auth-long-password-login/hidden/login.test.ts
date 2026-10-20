import assert from "node:assert/strict";
import { before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);
const invalid = { ok: false, status: 401, error: "invalid_credentials" };
let login: (email: string, password: string) => Promise<any>;
let userId: string;

before(async () => {
  const { auth } = await load("../../src/auth.ts");
  ({ login } = await load("../../src/login.ts"));
  const res = await auth.api.signUpEmail({ body: { email: "maya@example.com", password: "olive-oil-and-salt", name: "Maya" } });
  userId = res.user.id;
});

test("correct credentials sign the user in", async () => {
  const result = await login("maya@example.com", "olive-oil-and-salt");
  assert.equal(result.ok, true);
  assert.equal(result.userId, userId);
  assert.equal(typeof result.token, "string");
  assert.ok(result.token.length > 0);
});

test("a wrong password is invalid credentials", async () => {
  assert.deepEqual(await login("maya@example.com", "olive-oil-and-pepper"), invalid);
});

test("an unknown email is invalid credentials", async () => {
  assert.deepEqual(await login("nobody@example.com", "olive-oil-and-salt"), invalid);
});

test("an absurdly long pasted password is invalid credentials", async () => {
  const pasted = "olive-oil-and-salt ".repeat(60);
  assert.deepEqual(await login("maya@example.com", pasted), invalid);
});
