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

describe("restock flow", () => {
  const inventory = new Inventory();

  test("receives 10 units of SKU-1", { concurrent: false }, async () => {
    await inventory.receive("SKU-1", 10);
    expect(await inventory.available("SKU-1")).toBe(10);
  });

  test("reserves 4 of them", { concurrent: false }, async () => {
    await inventory.reserve("SKU-1", 4);
  });

  test("has 6 available", { concurrent: false }, async () => {
    expect(await inventory.available("SKU-1")).toBe(6);
  });
});
