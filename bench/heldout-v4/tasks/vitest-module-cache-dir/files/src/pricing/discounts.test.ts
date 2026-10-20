import { describe, expect, test } from "vitest";
import { applyDiscount } from "./discounts.ts";

describe("applyDiscount", () => {
  test("percent", () => expect(applyDiscount(80, { kind: "percent", value: 25 })).toBe(60));
  test("fixed never goes negative", () => expect(applyDiscount(5, { kind: "fixed", value: 10 })).toBe(0));
});
