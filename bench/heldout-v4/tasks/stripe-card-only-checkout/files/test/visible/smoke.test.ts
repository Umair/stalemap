import assert from "node:assert/strict";
import { test } from "node:test";
import { createCheckout } from "../../src/checkout.ts";
test("exports createCheckout()", () => assert.equal(typeof createCheckout, "function"));
