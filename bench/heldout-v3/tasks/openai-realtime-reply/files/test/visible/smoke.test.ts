import assert from "node:assert/strict";
import { test } from "node:test";
import { ask } from "../../src/realtime.ts";
test("exports ask()", () => assert.equal(typeof ask, "function"));
