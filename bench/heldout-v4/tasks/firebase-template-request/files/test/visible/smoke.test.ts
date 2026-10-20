import assert from "node:assert/strict";
import { test } from "node:test";

test("descriptions module exports", async () => {
  const mod = await import("../../src/descriptions.ts");
  assert.equal(typeof mod.writeProductDescription, "function");
});
