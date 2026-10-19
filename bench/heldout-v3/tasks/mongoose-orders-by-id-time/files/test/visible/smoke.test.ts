import assert from "node:assert/strict";
import { test } from "node:test";
import { ordersCreatedBetween } from "../../src/orders.ts";
test("exports ordersCreatedBetween()", () => assert.equal(typeof ordersCreatedBetween, "function"));
