import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import * as total from "../../src/features/cart/total.ts";
test("total.ts imports through the alias and still works", () => {
  const src = readFileSync(new URL("../../src/features/cart/total.ts", import.meta.url), "utf8");
  assert.match(src, /from\s+["']@\/lib\/format(\.[jt]s)?["']/);
  assert.equal((total as Record<string, any>).cartTotal([{ priceCents: 250, quantity: 2 }, { priceCents: 100, quantity: 1 }]), "$6.00");
});
