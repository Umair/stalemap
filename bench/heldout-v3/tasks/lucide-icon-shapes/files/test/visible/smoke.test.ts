import assert from "node:assert/strict";
import { test } from "node:test";
import { iconShapes } from "../../src/iconShapes.ts";
test("exports iconShapes()", () => assert.equal(typeof iconShapes, "function"));
