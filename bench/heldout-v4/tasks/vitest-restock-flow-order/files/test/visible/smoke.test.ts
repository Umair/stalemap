import assert from "node:assert/strict";
import { test } from "node:test";
import { Inventory } from "../../src/inventory.ts";
import config from "../../vitest.config.ts";

test("Inventory and the Vitest config load", () => {
  assert.equal(typeof Inventory, "function");
  assert.ok(config);
});
