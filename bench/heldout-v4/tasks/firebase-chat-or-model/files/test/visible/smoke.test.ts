import assert from "node:assert/strict";
import { test } from "node:test";

test("help module exports", async () => {
  const mod = await import("../../src/help.ts");
  assert.equal(typeof mod.ask, "function");
  assert.ok(mod.helpModel);
});
