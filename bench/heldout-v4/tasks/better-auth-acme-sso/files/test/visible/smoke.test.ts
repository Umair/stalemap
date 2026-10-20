import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuth } from "../../src/auth.ts";

test("exports createAuth", () => {
  assert.equal(typeof createAuth, "function");
});
