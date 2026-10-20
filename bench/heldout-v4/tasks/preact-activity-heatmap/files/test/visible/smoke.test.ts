import assert from "node:assert/strict";
import { test } from "node:test";
import { ActivityHeatmap } from "../../src/ActivityHeatmap.tsx";
import { mountHeatmap } from "../../src/main.tsx";

test("exports ActivityHeatmap and mountHeatmap", () => {
  assert.ok(ActivityHeatmap);
  assert.equal(typeof mountHeatmap, "function");
});
