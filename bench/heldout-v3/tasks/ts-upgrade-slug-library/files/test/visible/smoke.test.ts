import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify, stripAccents, truncate } from "../../src/index.ts";
test("exports the slug helpers", () => {
  assert.equal(typeof slugify, "function");
  assert.equal(typeof stripAccents, "function");
  assert.equal(typeof truncate, "function");
});
