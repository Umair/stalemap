import assert from "node:assert/strict";
import { test } from "node:test";

test("ai module exports", async () => {
  const mod = await import("../../src/ai.ts");
  assert.ok(mod.ai);
  assert.equal(typeof mod.summarizeTicket, "function");
});
