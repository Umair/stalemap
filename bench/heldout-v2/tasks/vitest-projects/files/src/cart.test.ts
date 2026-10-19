import { expect, test } from "vitest";

test("adds line items", () => {
  expect([250, 100].reduce((a, b) => a + b, 0)).toBe(350);
});
