import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as JestSourceMap from "@jest/source-map";

/** The file that called the function that called this one. */
function callerFile(): string {
  const site = new JestSourceMap.SourceMapSupport().getCallsite(2);
  const name = site.getFileName() ?? "";
  return name.startsWith("file://") ? decodeURIComponent(new URL(name).pathname) : name;
}

/**
 * Absolute path of `name` inside the `__fixtures__` folder next to the file that calls this,
 * e.g. `fixturePath("order.json")` from `test/orders/checkout.test.ts` gives
 * `<repo>/test/orders/__fixtures__/order.json`.
 */
export function fixturePath(name: string): string {
  return path.resolve(path.dirname(callerFile()), "__fixtures__", name);
}

/** Reads and parses a JSON file (pass it a path from fixturePath()). */
export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
