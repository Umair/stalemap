import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/payment.ts";
const schema = (mod as Record<string, any>).PaymentSchema;
test("card numbers and currencies", () => {
  assert.equal(schema.safeParse({ cardNumber: "4242424242424242", currency: "USD" }).success, true);
  for (const bad of [{ cardNumber: "4242424242424241", currency: "USD" }, { cardNumber: "4242", currency: "USD" }, { cardNumber: "4242424242424242", currency: "usd" }, { cardNumber: "4242424242424242", currency: "US" }]) {
    assert.equal(schema.safeParse(bad).success, false, JSON.stringify(bad));
  }
});
