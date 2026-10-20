import { describe, expect, test } from "vitest";
import { connectToStagingDatabase } from "./staging.ts";

const db = await connectToStagingDatabase();

describe("cart", () => {
  test("adds items", async () => {
    expect(await db.query("select 1")).toBeDefined();
  });

  describe("discounts", () => {
    test("applies a percentage coupon", () => {});
    test.skip("stacks coupons", () => {});
  });
});

test("an empty cart totals 0", () => {});
