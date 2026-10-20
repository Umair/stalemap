import assert from "node:assert/strict";
import { test } from "node:test";
import { fixturePath, readJson } from "../../src/testing/fixtures.ts";

test("exports fixturePath() and readJson()", () => {
  assert.equal(typeof fixturePath, "function");
  assert.equal(typeof readJson, "function");
});
