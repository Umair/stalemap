import assert from "node:assert/strict";
import { test } from "node:test";
import { answerWithStats } from "../../src/stats.ts";
test("exports answerWithStats()", () => assert.equal(typeof answerWithStats, "function"));
