import assert from "node:assert/strict";
import { test } from "node:test";
import { createHandler } from "../../src/server/handler.ts";
test("exports createHandler()", () => assert.equal(typeof createHandler, "function"));
