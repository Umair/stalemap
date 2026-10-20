import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { formatPrice } from "../src/price.ts";

test("prices are formatted for the storefront", async ({ annotate }) => {
  const rendered = ["tea", "mug"].map((sku, i) => `${sku}: ${formatPrice((i + 1) * 4.5)}`).join("\n");
  const dump = join(mkdtempSync(join(tmpdir(), "web-")), "price-list.txt");
  writeFileSync(dump, `project: web\n${rendered}\n`);
  await annotate("rendered price list", { path: dump });
  expect(formatPrice(4.5)).toBe("€4.50");
});
