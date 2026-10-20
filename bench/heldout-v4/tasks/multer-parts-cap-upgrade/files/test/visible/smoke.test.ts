import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp, MAX_PARTS } from "../../src/app.ts";
test("exports createApp() and MAX_PARTS", () => {
  assert.equal(typeof createApp, "function");
  assert.equal(typeof MAX_PARTS, "number");
});
