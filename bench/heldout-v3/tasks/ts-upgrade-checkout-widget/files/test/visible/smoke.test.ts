import assert from "node:assert/strict";
import { test } from "node:test";
import { Cart, formatPrice, refreshPrices, summarize } from "../../src/index.ts";
test("exports the widget API", () => {
  assert.equal(typeof Cart, "function");
  assert.equal(typeof formatPrice, "function");
  assert.equal(typeof refreshPrices, "function");
  assert.equal(typeof summarize, "function");
});
