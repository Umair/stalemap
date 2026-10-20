import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEnvFile } from "../../src/env.ts";
import { loadEnvFiles } from "../../src/startup.ts";

test("exports the env loaders", () => {
  assert.equal(typeof applyEnvFile, "function");
  assert.equal(typeof loadEnvFiles, "function");
});
