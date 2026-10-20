import assert from "node:assert/strict";
import { test } from "node:test";
import { login } from "../../src/login.ts";

test("exports login", () => {
  assert.equal(typeof login, "function");
});
