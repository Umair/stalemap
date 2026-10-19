import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration, parseDuration } from "../../src/index.ts";
test("exports the duration helpers", () => {
  assert.equal(typeof parseDuration, "function");
  assert.equal(typeof formatDuration, "function");
});
