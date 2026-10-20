import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify } from "../../src/slugify.ts";
import config from "../../vitest.config.ts";

test("slugify and the Vitest config load", () => {
  assert.equal(typeof slugify, "function");
  assert.ok(config);
});
