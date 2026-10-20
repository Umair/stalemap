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
  assert.ok(results.some((r) => r.filePath.endsWith("weights.js")), "src/rollout/weights.js is linted");
});

test("the lint config is as strict as before", async () => {
  const eslint = new ESLint({ cwd: root });
  const config = await eslint.calculateConfigForFile("src/rollout/weights.js");
  assert.deepEqual(config.rules["no-loss-of-precision"], [2]);
  assert.equal(config.linterOptions.reportUnusedDisableDirectives, 2);
});

const close = (actual: Record<string, number>, expected: Record<string, number>) => {
  assert.deepEqual(Object.keys(actual), Object.keys(expected));
  for (const k of Object.keys(expected)) assert.ok(Math.abs(actual[k] - expected[k]) < 1e-12, `${k}: ${actual[k]} vs ${expected[k]}`);
};

test("rollouts split traffic as before", async () => {
  const { normalize, pick, bucketFor } = await load("../../src/rollout/weights.js");
  close(normalize({ control: 90, newCheckout: 10 }), { control: 0.9, newCheckout: 0.1 });
  close(normalize({ control: 0.5, a: 0.25, b: 0.25 }), { control: 0.5, a: 0.25, b: 0.25 });
  close(normalize({ control: 3, paused: 0, b: 1 }), { control: 0.75, b: 0.25 });
  close(normalize({ control: 1, tiny: 1e-9 }), { control: 1 / (1 + 1e-9), tiny: 1e-9 / (1 + 1e-9) });
  assert.throws(() => normalize({ a: 0, b: 0 }), /at least one variant/);
  assert.throws(() => normalize({}), /at least one variant/);
  assert.equal(pick({ control: 90, newCheckout: 10 }, 0.05), "control");
  assert.equal(pick({ control: 90, newCheckout: 10 }, 0.95), "newCheckout");
  assert.equal(pick({ off: 0, on: 1 }, 0), "on");
  assert.equal(bucketFor("user-42"), bucketFor("user-42"));
  const b = bucketFor("user-42");
  assert.ok(b >= 0 && b < 1);
});
