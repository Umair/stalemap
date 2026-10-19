import assert from "node:assert/strict";
import { test } from "node:test";
import { iconFromSvg } from "../../src/icons/fromSvg.ts";
import { parseSvgShapes } from "../../src/icons/svg.ts";
test("exports iconFromSvg() and parseSvgShapes()", () => {
  assert.equal(typeof iconFromSvg, "function");
  assert.equal(typeof parseSvgShapes, "function");
});
