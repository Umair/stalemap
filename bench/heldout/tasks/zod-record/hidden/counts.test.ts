import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/counts.ts";
const schema = (mod as Record<string, any>).WordCountsSchema;
test("validates word counts", () => {
  assert.equal(schema.safeParse({ the: 3, cat: 1 }).success, true);
  assert.equal(schema.safeParse({}).success, true);
  for (const bad of [{ the: -1 }, { the: 1.5 }, { the: "3" }]) assert.equal(schema.safeParse(bad).success, false, JSON.stringify(bad));
});
