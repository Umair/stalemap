import assert from "node:assert/strict";
import { test } from "node:test";
import { ThemeOverrides } from "../../src/theme.ts";
import { themeCss } from "../../src/apply.ts";
test("exports the theme schema", () => {
  assert.equal(typeof ThemeOverrides.safeParse, "function");
  assert.equal(typeof themeCss, "function");
});
