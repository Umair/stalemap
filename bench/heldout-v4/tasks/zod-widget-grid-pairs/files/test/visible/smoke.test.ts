import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWidget, widgetJsonSchema } from "../../src/widgets.ts";
import { loadDashboard } from "../../src/dashboards.ts";

test("exports the widget parser", () => {
  assert.equal(typeof parseWidget, "function");
  assert.equal(typeof loadDashboard, "function");
  assert.equal(widgetJsonSchema.title, "Widget");
});
