import assert from "node:assert/strict";
import { test } from "node:test";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
test("unit and dom projects, each test file in exactly one", async () => {
  // Let Vitest resolve the config and list each project's files.
  const { createVitest } = await load("vitest/node");
  const vitest = await createVitest("test", { root, watch: false, run: false }, {}, {});
  try {
    const projects: Record<string, { environment: string; files: string[] }> = {};
    for (const p of vitest.projects) {
      const { testFiles } = await p.globTestFiles();
      projects[p.name] = { environment: p.config.environment, files: testFiles.map((f: string) => relative(root, f)).sort() };
    }
    assert.deepEqual(projects, {
      unit: { environment: "node", files: ["src/cart.test.ts"] },
      dom: { environment: "jsdom", files: ["src/components/banner.dom.test.ts"] },
    });
  } finally {
    await vitest.close();
  }
});
