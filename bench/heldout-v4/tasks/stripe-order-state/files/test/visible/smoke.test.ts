import assert from "node:assert/strict";
import { test } from "node:test";
import { orderState } from "../../src/orders.ts";
import { orderHeadline } from "../../src/orderSummary.ts";
test("exports orderState() and orderHeadline()", () => {
  assert.equal(typeof orderState, "function");
  assert.equal(typeof orderHeadline, "function");
});
