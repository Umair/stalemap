import assert from "node:assert/strict";
import { test } from "node:test";
import { auth } from "../../src/auth.ts";

test("exports the auth instance", () => {
  assert.equal(typeof auth.handler, "function");
});
