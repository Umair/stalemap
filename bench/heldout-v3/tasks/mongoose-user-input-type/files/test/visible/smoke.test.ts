import assert from "node:assert/strict";
import { test } from "node:test";
import { seedUsers } from "../../src/seed.ts";
import { fromSignupForm } from "../../src/users.ts";
test("exports the seed users and fromSignupForm()", () => {
  assert.ok(Array.isArray(seedUsers));
  assert.equal(typeof fromSignupForm, "function");
});
