import { describe, expect, test } from "vitest";
import { Inventory } from "./inventory.ts";

describe("inventory", () => {
  test("an unknown SKU has nothing available", async () => {
    expect(await new Inventory().available("SKU-404")).toBe(0);
  });

  test("reserving more than is on hand fails", async () => {
    const inventory = new Inventory();
    await inventory.receive("SKU-2", 1);
    await expect(inventory.reserve("SKU-2", 2)).rejects.toThrow("Not enough SKU-2 in stock");
  });
});
