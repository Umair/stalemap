import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const shop = fileURLToPath(new URL("../../fixtures/shop", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("lists every test without running the files, and without deprecated Vitest APIs", async () => {
  rmSync(`${shop}/connected.txt`, { force: true });
  const { listTests } = await load("../../src/tooling/list-tests.ts");
  // Vitest reports deprecated API use through its logger, on stderr.
  let stderr = "";
  const write = process.stderr.write;
  process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => {
    stderr += String(chunk);
    return (write as any).call(process.stderr, chunk, ...rest);
  }) as typeof process.stderr.write;
  let names: string[];
  try {
    names = await listTests(shop);
  } finally {
    process.stderr.write = write;
  }
  assert.deepEqual([...names].sort(), [
    "an empty cart totals 0",
    "cart > adds items",
    "cart > discounts > applies a percentage coupon",
    "cart > discounts > stacks coupons",
    "checkout > charges the saved card",
    "checkout > retries a declined card",
  ]);
  assert.equal(existsSync(`${shop}/connected.txt`), false, "a test file was imported");
  assert.doesNotMatch(stderr, /deprecated/i, "Vitest warned about a deprecated API");
});
