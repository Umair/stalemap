import assert from "node:assert/strict";
import { test } from "node:test";
import { cartTotal } from "../../src/features/cart/total.ts";
test("exports cartTotal()", () => assert.equal(typeof cartTotal, "function"));
