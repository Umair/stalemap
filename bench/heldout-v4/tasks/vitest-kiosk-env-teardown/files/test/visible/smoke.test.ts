import assert from "node:assert/strict";
import { test } from "node:test";
import kioskEnvironment from "../../src/testing/kiosk-environment.ts";

test("exports the kiosk test environment", () => {
  assert.equal(kioskEnvironment.name, "kiosk");
  assert.equal(typeof kioskEnvironment.setup, "function");
});
