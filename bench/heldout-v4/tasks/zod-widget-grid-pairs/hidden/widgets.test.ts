import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { parseWidget } = await load("../../src/widgets.ts");
const { loadDashboard } = await load("../../src/dashboards.ts");

const chart = { id: "w1", kind: "chart", title: "Signups", position: [0, 2], size: [4, 3] };

test("a valid widget parses to the same data", () => {
  assert.deepEqual(parseWidget(chart), chart);
  const note = { id: "n", kind: "note", position: [5, 0], size: [1, 1] };
  assert.deepEqual(parseWidget(note), note);
});

test("the rest of the shared schema is enforced", () => {
  assert.throws(() => parseWidget({ ...chart, kind: "map" }));
  assert.throws(() => parseWidget({ ...chart, id: "" }));
  assert.throws(() => parseWidget({ ...chart, position: [-1, 0] }));
  assert.throws(() => parseWidget({ ...chart, size: [0, 3] }));
  assert.throws(() => parseWidget({ ...chart, size: [1.5, 3] }));
  assert.throws(() => parseWidget({ ...chart, color: "red" }));
  const { size, ...noSize } = chart;
  assert.throws(() => parseWidget(noSize));
});

test("position must be exactly a pair", () => {
  assert.throws(() => parseWidget({ ...chart, position: [0] }));
  assert.throws(() => parseWidget({ ...chart, position: [0, 2, 1] }), "a third coordinate is rejected");
  assert.throws(() => parseWidget({ ...chart, position: [0, 2, "x"] }));
});

test("size must be exactly a pair", () => {
  assert.throws(() => parseWidget({ ...chart, size: [4] }));
  assert.throws(() => parseWidget({ ...chart, size: [4, 3, 2] }), "a depth is rejected");
});

test("a saved dashboard with a malformed widget is rejected", () => {
  const ok = JSON.stringify({ name: "Growth", widgets: [chart] });
  assert.equal(loadDashboard(ok).widgets.length, 1);
  const bad = JSON.stringify({ name: "Growth", widgets: [chart, { ...chart, id: "w2", position: [1, 1, 1] }] });
  assert.throws(() => loadDashboard(bad));
});
