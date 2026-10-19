import assert from "node:assert/strict";
import { test } from "node:test";
import { Address, Customer } from "../../src/schemas.ts";
import { shippingAddress } from "../../src/checkout.ts";
test("exports the schemas and shippingAddress()", () => {
  assert.equal(typeof Address.parse, "function");
  assert.equal(typeof Customer.parse, "function");
  assert.equal(typeof shippingAddress, "function");
});
