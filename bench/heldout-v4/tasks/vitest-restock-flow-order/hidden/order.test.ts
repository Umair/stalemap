import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("the restock flow runs in order, everything else concurrently", async () => {
  const { startVitest } = await load("vitest/node");
  const vitest = await startVitest("test", ["src/inventory.test.ts"], { root, watch: false, reporters: [{}] }, {}, {});
  const flow: { name: string; concurrent: boolean; state: string }[] = [];
  const others: { name: string; concurrent: boolean; state: string }[] = [];
  try {
    const modules = vitest.state.getTestModules();
    assert.equal(modules.length, 1);
    assert.deepEqual(modules[0].errors().map((e: any) => e.message), [], "the test file loads");
    for (const t of modules[0].children.allTests()) {
      const names: string[] = [];
      for (let s = t.parent; s && s.type === "suite"; s = s.parent) names.push(s.name);
      (names.includes("restock flow") ? flow : others).push({ name: t.fullName, concurrent: t.options.concurrent === true, state: t.result().state });
    }
  } finally {
    await vitest.close();
    process.exitCode = 0;
  }
  assert.ok(flow.length >= 2, `the restock flow has its steps as separate tests: ${JSON.stringify(flow)}`);
  for (const t of flow) {
    assert.equal(t.state, "passed", `${t.name} passes`);
    assert.equal(t.concurrent, false, `${t.name} runs on its own, after the previous step`);
  }
  assert.equal(others.length, 2, "the existing tests are kept");
  for (const t of others) {
    assert.equal(t.state, "passed", `${t.name} passes`);
    assert.equal(t.concurrent, true, `${t.name} still runs concurrently`);
  }
});
