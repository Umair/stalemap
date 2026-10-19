import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/validation.ts";
const userErrors = (mod as Record<string, any>).userErrors;
const ok = { email: "a@b.co", role: "admin", tags: { beta: true } };
test("same behavior as before the upgrade", () => {
  assert.deepEqual(userErrors(ok), []);
  assert.ok(userErrors({ role: "admin", tags: {} }).includes("Email is required"));
  assert.ok(userErrors({ ...ok, email: "nope" }).includes("Invalid email"));
  assert.ok(userErrors({ ...ok, role: "owner" }).length > 0);
  assert.ok(userErrors({ ...ok, tags: { beta: "yes" } }).length > 0);
  assert.ok(userErrors({ ...ok, extra: 1 }).length > 0, "unknown keys are rejected");
});
