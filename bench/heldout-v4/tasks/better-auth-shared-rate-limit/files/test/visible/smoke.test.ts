import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuth } from "../../src/auth.ts";
import { createMemoryKv } from "../../src/kv.ts";

test("exports createAuth and createMemoryKv", () => {
  assert.equal(typeof createAuth, "function");
  assert.equal(typeof createMemoryKv, "function");
});
