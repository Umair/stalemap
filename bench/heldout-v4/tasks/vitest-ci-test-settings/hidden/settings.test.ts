import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("settings come from the project's config", async () => {
  const { getTestSettings } = await load("../../src/tooling/test-settings.ts");
  const settings = await getTestSettings(`${root}fixtures/web-app`);
  assert.deepEqual({ ...settings, include: [...settings.include] }, { environment: "jsdom", testTimeout: 10_000, include: ["tests/**/*.spec.ts"] });
});

test("settings the config leaves out get Vitest's defaults", async () => {
  const { configDefaults } = await load("vitest/config");
  const { getTestSettings } = await load("../../src/tooling/test-settings.ts");
  const settings = await getTestSettings(`${root}fixtures/api`);
  assert.deepEqual({ ...settings, include: [...settings.include] }, { environment: "node", testTimeout: 20_000, include: [...configDefaults.include] });
});
