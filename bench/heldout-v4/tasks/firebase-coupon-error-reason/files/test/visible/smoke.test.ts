import assert from "node:assert/strict";
import { test } from "node:test";

test("coupons module exports", async () => {
  const mod = await import("../../src/coupons.ts");
  assert.equal(typeof mod.redeemCoupon, "function");
});
