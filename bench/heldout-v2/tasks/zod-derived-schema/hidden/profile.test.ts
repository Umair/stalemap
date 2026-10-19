import assert from "node:assert/strict";
import { test } from "node:test";
import * as account from "../../src/account.ts";
import * as profile from "../../src/profile.ts";
const ProfileSchema = (profile as Record<string, any>).ProfileSchema;
const AccountSchema = (account as Record<string, any>).AccountSchema;
test("profile fields with the account rules", () => {
  assert.deepEqual(ProfileSchema.parse({ email: "ada@example.com", displayName: "  Ada " }), { email: "ada@example.com", displayName: "Ada" });
  for (const bad of [{ email: "nope", displayName: "Ada" }, { email: "ada@example.com", displayName: "   " }, { email: "ada@example.com", displayName: "x".repeat(41) }, { displayName: "Ada" }]) {
    assert.equal(ProfileSchema.safeParse(bad).success, false, JSON.stringify(bad));
  }
});
test("AccountSchema still checks the confirmation", () => {
  const ok = { email: "ada@example.com", displayName: "Ada", password: "correct horse battery", confirmPassword: "correct horse battery" };
  assert.equal(AccountSchema.safeParse(ok).success, true);
  const r = AccountSchema.safeParse({ ...ok, confirmPassword: "nope" });
  assert.equal(r.success, false);
  assert.deepEqual(r.error.issues.map((i: { path: PropertyKey[] }) => i.path.join(".")), ["confirmPassword"]);
});
