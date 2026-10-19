import assert from "node:assert/strict";
import { test } from "node:test";
import { cartTotal, summary } from "../../src/cart.ts";
test("exports the cart helpers", () => {
  assert.equal(typeof cartTotal, "function");
  assert.equal(typeof summary, "function");
});
