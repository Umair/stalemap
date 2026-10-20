import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("every fixture has a passing test named slugify '<input>'", async () => {
  const { startVitest } = await load("vitest/node");
  const vitest = await startVitest("test", ["src/slugify.test.ts"], { root, watch: false, reporters: [{}] }, {}, {});
  const results: Record<string, string> = {};
  try {
    for (const mod of vitest.state.getTestModules()) {
      assert.equal(mod.state(), "passed", `the test file ran without errors: ${JSON.stringify(mod.errors?.())}`);
      for (const t of mod.children.allTests()) results[t.name] = t.result().state;
    }
  } finally {
    await vitest.close();
    process.exitCode = 0;
  }
  const expected = [
    "Hello World",
    "Release Notes v2.1",
    "Crème Brûlée",
    "  Spaces  Everywhere  ",
    "C# & .NET Tips",
    "2026: A Year in Review",
    "---Already-Slugged---",
  ].map((input) => `slugify '${input}'`);
  assert.deepEqual(Object.keys(results).sort(), expected.sort());
  for (const name of expected) assert.equal(results[name], "passed", `${name} passes`);
});
