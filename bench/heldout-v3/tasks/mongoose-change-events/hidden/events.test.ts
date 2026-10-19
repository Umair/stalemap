import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { toChangeEvent } = await load("../../src/events.ts");
const { Customer, Order } = await load("../../src/models.ts");

test("events carry the collection and the string id", () => {
  const customer = new Customer({ name: "Ada", email: "ada@example.com" });
  const order = new Order({ customer: customer._id, total: 42 });
  assert.deepEqual(toChangeEvent("saved", customer), { type: "saved", collection: "customers", id: customer._id.toHexString() });
  assert.deepEqual(toChangeEvent("deleted", order), { type: "deleted", collection: "orders", id: order._id.toHexString() });
});

test("the event survives a JSON round trip unchanged", () => {
  const order = new Order({ customer: new Customer({ name: "Grace", email: "g@example.com" })._id, total: 7 });
  const event = toChangeEvent("saved", order);
  assert.equal(typeof event.id, "string");
  assert.deepEqual(JSON.parse(JSON.stringify(event)), event);
});
