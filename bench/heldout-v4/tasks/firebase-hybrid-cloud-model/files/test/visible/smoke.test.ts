import assert from "node:assert/strict";
import { test } from "node:test";

test("assistant module exports", async () => {
  const mod = await import("../../src/assistant.ts");
  assert.equal(typeof mod.summarizeNote, "function");
});
