import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { orderResponse } from "../src/orders.ts";

test("order response totals the lines", async ({ annotate }) => {
  const response = orderResponse({ id: "ord_1", items: [{ sku: "tea", qty: 2, price: 4 }, { sku: "mug", qty: 1, price: 12 }] });
  // Keep the response body with the test results so failures can be debugged from CI.
  const dump = join(mkdtempSync(join(tmpdir(), "api-")), "order-response.json");
  writeFileSync(dump, JSON.stringify({ project: "api", response }));
  await annotate("order response", { path: dump });
  expect(response).toEqual({ id: "ord_1", total: 20, lines: 2 });
});
