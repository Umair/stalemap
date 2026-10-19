import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { Address, Customer } = await load("../../src/schemas.ts");
const { shippingAddress } = await load("../../src/checkout.ts");

const home = { name: "Ada", line1: "1 Analytical St", city: "London", postalCode: "N1 1AA", country: "gb" };
const customer = Customer.parse({ id: "c1", email: "ada@example.com" });

test("Address still validates and normalizes the country", () => {
  assert.deepEqual(Address.parse(home), { ...home, country: "GB" });
  assert.equal(Address.safeParse({ ...home, country: "BR" }).success, false);
  assert.equal(Address.safeParse({ ...home, city: "" }).success, false);
  assert.equal(Customer.safeParse({ id: "c2", email: "nope" }).success, false);
  assert.deepEqual(Customer.parse({ id: "c3", email: "x@example.com", defaultAddress: home }).defaultAddress, { ...home, country: "GB" });
});

test("shippingAddress picks entered, then default, then store pickup", () => {
  const entered = Address.parse(home);
  const saved = Address.parse({ ...home, name: "Ada (work)", country: "US" });
  assert.equal(shippingAddress(customer, entered, "DE"), entered);
  assert.equal(shippingAddress({ ...customer, defaultAddress: saved }, undefined, "DE"), saved);
  assert.deepEqual(shippingAddress(customer, undefined, "DE"), { name: "Store pickup", line1: "12 Harbour Road", city: "Springfield", postalCode: "10001", country: "DE" });
  assert.equal(shippingAddress(customer, undefined, "NL").country, "NL");
});
