import assert from "node:assert/strict";
import { test } from "node:test";
import { chargeOrder } from "../../src/checkout.ts";
import { DECLINE_MESSAGES } from "../../src/declines.ts";
test("exports chargeOrder() and the decline messages", () => {
  assert.equal(typeof chargeOrder, "function");
  assert.equal(typeof DECLINE_MESSAGES, "object");
});
