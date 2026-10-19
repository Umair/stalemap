import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthOptions, emailProvider } from "../../src/auth.ts";
test("exports the auth config", () => {
  assert.equal(typeof createAuthOptions, "function");
  assert.equal(emailProvider.type, "email");
});
