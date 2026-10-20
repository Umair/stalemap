import assert from "node:assert/strict";
import { test } from "node:test";

test("images module exports", async () => {
  const mod = await import("../../src/images.ts");
  assert.equal(typeof mod.generateProductPhoto, "function");
});
