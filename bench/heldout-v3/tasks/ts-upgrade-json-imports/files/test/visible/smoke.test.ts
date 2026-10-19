import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "../../src/config.ts";
import { translate } from "../../src/i18n.ts";
import { welcome } from "../../src/index.ts";
test("exports the app helpers", () => {
  assert.equal(typeof loadConfig, "function");
  assert.equal(typeof translate, "function");
  assert.equal(typeof welcome, "function");
});
