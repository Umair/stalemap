import assert from "node:assert/strict";
import { test } from "node:test";
import * as configModule from "../../src/config.ts";
import * as i18n from "../../src/i18n.ts";
import * as app from "../../src/index.ts";

const { loadConfig } = configModule as Record<string, any>;
const { translate } = i18n as Record<string, any>;
const { welcome } = app as Record<string, any>;

test("the defaults come from config/defaults.json", () => {
  const config = loadConfig();
  assert.equal(config.locale, "en");
  assert.equal(config.pageSize, 25);
  assert.deepEqual(config.features, { export: true, betaSearch: false });
  const custom = loadConfig({ pageSize: 50, features: { betaSearch: true } });
  assert.equal(custom.pageSize, 50);
  assert.deepEqual(custom.features, { export: true, betaSearch: true });
});

test("translations load from locales/*.json", async () => {
  assert.equal(await translate("de", "greeting", { name: "Ada" }), "Hallo, Ada!");
  assert.equal(await translate("de", "bye"), "Goodbye.", "falls back to English");
  assert.equal(await welcome("Ada", 3), "Hello, Ada!\nYou have 3 items.");
  assert.equal(await welcome("Jan", 2, "de"), "Hallo, Jan!\nDu hast 2 Einträge.");
});
