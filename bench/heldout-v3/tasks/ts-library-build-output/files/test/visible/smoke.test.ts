import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify, truncateWords } from "../../src/index.ts";
test("exports the text helpers", () => {
  assert.equal(typeof slugify, "function");
  assert.equal(typeof truncateWords, "function");
});
