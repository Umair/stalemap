import assert from "node:assert/strict";
import { test } from "node:test";
import { describeOrder, findOrder, lineTotal, orderTotal } from "../../src/orders.ts";
test("exports the order helpers", () => {
  for (const fn of [describeOrder, findOrder, lineTotal, orderTotal]) assert.equal(typeof fn, "function");
});
