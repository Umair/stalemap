import assert from "node:assert/strict";
import { test } from "node:test";
import { markCorrectAnswer, renameQuestion } from "../../src/quizEditor.ts";

test("exports the quiz editor helpers", () => {
  assert.equal(typeof markCorrectAnswer, "function");
  assert.equal(typeof renameQuestion, "function");
});
