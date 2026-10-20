import { readFileSync } from "node:fs";

/**
 * Absolute path of `name` inside the `__fixtures__` folder next to the file that calls this,
 * e.g. `fixturePath("order.json")` from `test/orders/checkout.test.ts` gives
 * `<repo>/test/orders/__fixtures__/order.json`.
 */
export function fixturePath(name: string): string {
  throw new Error(`fixturePath(${name}): not implemented`);
}

/** Reads and parses a JSON file (pass it a path from fixturePath()). */
export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
