import assert from "node:assert/strict";
import { test } from "node:test";
import { CACHE_NAME, PRECACHE_URLS } from "../../src/precache.ts";
test("exports the precache settings", () => {
  assert.equal(typeof CACHE_NAME, "string");
  assert.ok(Array.isArray(PRECACHE_URLS));
});
