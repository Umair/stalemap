import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnv } from "../../src/env.ts";
import { start } from "../../src/main.ts";

test("exports the env loader", () => {
  assert.equal(typeof loadEnv, "function");
  assert.equal(typeof start, "function");
});
