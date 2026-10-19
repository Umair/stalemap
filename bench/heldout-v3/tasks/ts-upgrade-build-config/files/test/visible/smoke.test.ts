import assert from "node:assert/strict";
import { test } from "node:test";
import { countTags, loadAll, published, uniqueTags } from "../../src/index.ts";
test("exports the library functions", () => {
  for (const fn of [countTags, loadAll, published, uniqueTags]) assert.equal(typeof fn, "function");
});
