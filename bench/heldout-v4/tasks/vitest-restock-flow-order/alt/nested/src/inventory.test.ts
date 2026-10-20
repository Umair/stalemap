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

  describe("restock flow", { concurrent: false }, () => {
    let inventory: Inventory;

    test("receive 10 units of SKU-1", async () => {
      inventory = new Inventory();
      await inventory.receive("SKU-1", 10);
    });

    test("reserve 4", async () => {
      await inventory.reserve("SKU-1", 4);
    });

    test("6 are available", async () => {
      expect(await inventory.available("SKU-1")).toBe(6);
    });
  });
});
