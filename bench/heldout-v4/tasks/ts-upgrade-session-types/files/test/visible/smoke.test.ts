import assert from "node:assert/strict";
import { test } from "node:test";
import { apiHeaders, authOptions } from "../../src/auth.ts";

test("exports the auth config", () => {
  assert.equal(typeof authOptions, "object");
  assert.equal(typeof apiHeaders, "function");
});
