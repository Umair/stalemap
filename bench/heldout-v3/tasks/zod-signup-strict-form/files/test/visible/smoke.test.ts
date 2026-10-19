import assert from "node:assert/strict";
import { test } from "node:test";
import { SignupForm, ResetPasswordForm } from "../../src/schemas.ts";
test("exports the form schemas", () => {
  assert.equal(typeof SignupForm.safeParse, "function");
  assert.equal(typeof ResetPasswordForm.safeParse, "function");
});
