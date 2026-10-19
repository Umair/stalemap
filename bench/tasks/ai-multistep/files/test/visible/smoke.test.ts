import assert from "node:assert/strict";
import { test } from "node:test";
import { answer } from "../../src/answer.ts";
test("exports answer()", () => assert.equal(typeof answer, "function"));
