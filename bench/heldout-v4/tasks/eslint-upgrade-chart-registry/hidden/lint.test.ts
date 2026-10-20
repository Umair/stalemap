import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("npm run lint passes (no errors, no warnings)", async () => {
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(["."]);
  const problems = results.flatMap((r) => r.messages.map((m) => `${r.filePath}:${m.line} ${m.ruleId ?? ""} ${m.message}`));
  assert.deepEqual(problems, []);
  assert.ok(results.some((r) => r.filePath.endsWith("registry.js")), "src/charts/registry.js is linted");
});

test("the lint config is as strict as before", async () => {
  const eslint = new ESLint({ cwd: root });
  const config = await eslint.calculateConfigForFile("src/charts/registry.js");
  assert.deepEqual(config.rules["object-shorthand"], [2, "always", { ignoreConstructors: true }]);
  assert.deepEqual(config.rules["quote-props"], [2, "consistent-as-needed"]);
  assert.equal(config.linterOptions.reportUnusedDisableDirectives, 2);
});

test("the chart types are still constructors", async () => {
  const { charts, menu } = await load("../../src/charts/registry.js");
  assert.deepEqual(menu.names(), ["Bar Chart", "Sparkline", "Table"]);
  const series = [{ label: "Mon", value: 2 }, { label: "Tue", value: 4 }];
  const bar = new charts["Bar Chart"](series);
  assert.equal(bar.kind, "bar");
  assert.equal(bar.render(), "Mon    ##\nTue    ####");
  assert.equal(menu.create("Sparkline", series).render(), "▅█");
  assert.equal(menu.create("Table", series).render(), "Mon\t2\nTue\t4");
  assert.throws(() => menu.create("Pie", series), /Unknown chart type/);
});
