import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

const cases: [string, string[]][] = [
  ["viewer", ["invoices:read"]],
  ["support-agent", ["invoices:read", "customers:read", "customers:notes:write"]],
  ["billing-admin", ["invoices:read", "invoices:write", "refunds:issue", "payouts:read"]],
  ["billing-admin-eu", ["invoices:read", "invoices:write", "refunds:issue", "payouts:read", "vat:reports:export"]],
  ["owner", ["invoices:read", "invoices:write", "refunds:issue", "payouts:read", "payouts:schedule", "members:manage"]],
];

test("each permission test is named with its role and every action, untruncated", async () => {
  const { startVitest } = await load("vitest/node");
  const vitest = await startVitest("test", ["src/permissions.test.ts"], { root, watch: false, reporters: [{}] }, {}, {});
  const tests: { name: string; state: string }[] = [];
  try {
    for (const mod of vitest.state.getTestModules()) {
      assert.equal(mod.state(), "passed", "the test file runs and passes");
      for (const t of mod.children.allTests()) tests.push({ name: t.name, state: t.result().state });
    }
  } finally {
    await vitest.close();
    process.exitCode = 0;
  }
  assert.equal(tests.length, cases.length, `one test per role: ${JSON.stringify(tests.map((t) => t.name))}`);
  for (const t of tests) {
    assert.equal(t.state, "passed", `${t.name} passes`);
    assert.ok(!/…|\.\.\./.test(t.name), `"${t.name}" is cut off`);
  }
  for (const [role, actions] of cases) {
    const matches = tests.filter((t) => new RegExp(`(^|[^\\w-])${role}([^\\w-]|$)`).test(t.name));
    assert.equal(matches.length, 1, `exactly one test is named for ${role}: ${JSON.stringify(tests.map((t) => t.name))}`);
    for (const action of actions) assert.ok(matches[0].name.includes(action), `"${matches[0].name}" names ${action}`);
  }
});
