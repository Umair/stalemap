import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidLabel, navItem } from "../../src/nav.ts";
test("exports navItem() and isValidLabel()", () => {
  assert.equal(typeof navItem, "function");
  assert.equal(typeof isValidLabel, "function");
});
