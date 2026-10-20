import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSite, postPath, renderPage, titleTooLong } from "../../src/site.ts";

test("exports the site helpers", () => {
  assert.equal(typeof buildSite, "function");
  assert.equal(typeof postPath, "function");
  assert.equal(typeof renderPage, "function");
  assert.equal(typeof titleTooLong, "function");
});
