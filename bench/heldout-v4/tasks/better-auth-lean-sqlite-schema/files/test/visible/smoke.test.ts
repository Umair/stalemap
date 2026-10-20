import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuth } from "../../src/auth.ts";
import { openDatabase } from "../../src/db.ts";

test("exports createAuth and openDatabase", () => {
  assert.equal(typeof createAuth, "function");
  assert.equal(typeof openDatabase, "function");
});
