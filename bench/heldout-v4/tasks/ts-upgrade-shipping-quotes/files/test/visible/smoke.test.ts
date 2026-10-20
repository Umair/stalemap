import assert from "node:assert/strict";
import { test } from "node:test";
import { Carrier, pickShipping } from "../../src/checkout.ts";

test("exports the checkout helpers", () => {
  assert.equal(typeof pickShipping, "function");
  assert.equal(typeof Carrier, "object");
});
