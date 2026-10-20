import assert from "node:assert/strict";
import { test } from "node:test";
import { acme } from "../../src/acme.ts";
import { createAuth } from "../../src/auth.ts";

test("exports acme and createAuth", () => {
  assert.equal(typeof acme, "function");
  assert.equal(typeof createAuth, "function");
});
