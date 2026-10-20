import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCallsite } from "@jest/source-map";

/**
 * Absolute path of `name` inside the `__fixtures__` folder next to the file that calls this,
 * e.g. `fixturePath("order.json")` from `test/orders/checkout.test.ts` gives
 * `<repo>/test/orders/__fixtures__/order.json`.
 */
export function fixturePath(name: string): string {
  const file = getCallsite(1).getFileName();
  if (!file) throw new Error(`fixturePath(${name}): can't tell which file called it`);
  const caller = file.startsWith("file:") ? fileURLToPath(file) : file;
  return join(dirname(caller), "__fixtures__", name);
}

/** Reads and parses a JSON file (pass it a path from fixturePath()). */
export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
