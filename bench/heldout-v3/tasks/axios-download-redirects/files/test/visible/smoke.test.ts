import assert from "node:assert/strict";
import { test } from "node:test";
import { downloadFile, getProfile } from "../../src/client.ts";
test("exports the API helpers", () => {
  assert.equal(typeof getProfile, "function");
  assert.equal(typeof downloadFile, "function");
});
