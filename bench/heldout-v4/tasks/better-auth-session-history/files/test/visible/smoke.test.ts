import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuth } from "../../src/auth.ts";
import { createMemoryKv } from "../../src/kv.ts";
import { listSessionHistory } from "../../src/session-history.ts";

test("exports createAuth, createMemoryKv and listSessionHistory", () => {
  assert.equal(typeof createAuth, "function");
  assert.equal(typeof createMemoryKv, "function");
  assert.equal(typeof listSessionHistory, "function");
});
