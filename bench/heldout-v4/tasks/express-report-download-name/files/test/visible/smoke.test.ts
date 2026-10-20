import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../../src/app.ts";
import { downloadReport } from "../../src/client.ts";
test("exports createApp() and downloadReport()", () => {
  assert.equal(typeof createApp, "function");
  assert.equal(typeof downloadReport, "function");
});
