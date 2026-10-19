import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/safe-add.ts";
const safeAdd = (mod as Record<string, any>).safeAdd;
test("adds numbers and rejects other input", () => {
  assert.equal(safeAdd(1, 2), 3);
  assert.throws(() => safeAdd("1", 2), (e: unknown) => Array.isArray((e as { issues?: unknown }).issues), "throws a zod validation error");
});
