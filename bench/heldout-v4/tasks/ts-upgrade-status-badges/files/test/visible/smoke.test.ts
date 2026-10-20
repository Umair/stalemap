import { equal } from "node:assert/strict";
import { test } from "node:test";
import { durationLabel, lastRunLabel, StatusBadge, StatusList } from "../../src/index.ts";

test("exports the components and formatters", () => {
  equal(typeof StatusBadge, "function");
  equal(typeof StatusList, "function");
  equal(typeof durationLabel, "function");
  equal(typeof lastRunLabel, "function");
});
