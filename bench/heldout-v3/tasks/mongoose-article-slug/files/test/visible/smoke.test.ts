import assert from "node:assert/strict";
import { test } from "node:test";
import { Article, articleSchema } from "../../src/models/article.ts";
test("exports the Article model and schema", () => {
  assert.equal(typeof Article, "function");
  assert.ok(articleSchema);
});
