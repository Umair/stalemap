import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { SignupForm } = await load("../../src/schemas.ts");

const valid = { email: "ada@example.com", password: "correct horse", confirmPassword: "correct horse" };
const issues = (input: unknown) => {
  const r = SignupForm.safeParse(input);
  return r.success ? null : (r.error.issues as { code: string; path: PropertyKey[] }[]);
};

test("a valid signup parses", () => {
  const r = SignupForm.safeParse(valid);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, valid);
});

test("passwords must match and be long enough", () => {
  const mismatch = issues({ ...valid, confirmPassword: "correct horsf" });
  assert.ok(mismatch, "mismatched passwords are rejected");
  assert.ok(mismatch.some((i) => i.path.join(".") === "confirmPassword"), "the mismatch is reported on confirmPassword");
  assert.ok(issues({ ...valid, password: "short", confirmPassword: "short" }), "a short password is rejected");
  assert.ok(issues({ ...valid, email: "nope" }), "a bad email is rejected");
  assert.ok(issues({ email: valid.email, password: valid.password }), "confirmPassword is required");
});

test("extra keys are rejected", () => {
  const extra = issues({ ...valid, role: "admin" });
  assert.ok(extra, "an extra key is rejected");
  assert.ok(extra.some((i) => i.code === "unrecognized_keys"));
  assert.ok(issues({ ...valid, isAdmin: true, plan: "pro" }));
});
