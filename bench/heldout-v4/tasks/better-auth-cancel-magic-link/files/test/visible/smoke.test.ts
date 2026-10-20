import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuth } from "../../src/auth.ts";
import { cancelSignInLink } from "../../src/cancel-sign-in.ts";

test("exports createAuth and cancelSignInLink", () => {
  assert.equal(typeof createAuth, "function");
  assert.equal(typeof cancelSignInLink, "function");
});
