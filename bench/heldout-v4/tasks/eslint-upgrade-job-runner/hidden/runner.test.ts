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
  assert.ok(results.some((r) => r.filePath.endsWith("runner.js")), "src/jobs/runner.js is linted");
});

test("the lint config is as strict as before", async () => {
  const eslint = new ESLint({ cwd: root });
  const config = await eslint.calculateConfigForFile("src/jobs/runner.js");
  assert.deepEqual(config.rules["no-unsafe-finally"], [2]);
  assert.equal(config.linterOptions.reportUnusedDisableDirectives, 2);
});

test("jobs and listeners run as before", async () => {
  const { createRunner, createLocks } = await load("../../src/jobs/runner.js");
  const locks = createLocks();
  const calls: string[] = [];
  const runner = createRunner({
    locks,
    listeners: [
      (job: { id: string }) => {
        calls.push(`audit:${job.id}`);
      },
      (job: { id: string; quiet?: boolean }) => {
        calls.push(`skip?:${job.id}`);
        return job.quiet ? false : undefined;
      },
      (job: { id: string }) => {
        calls.push(`notify:${job.id}`);
      },
    ],
  });
  const results = await runner.runAll([{ id: "a" }, { id: "b", quiet: true }, { id: "c" }], async (job: { id: string }) => {
    assert.ok(locks.held.has(job.id), "the lock is held while the job runs");
    calls.push(`run:${job.id}`);
    return job.id.toUpperCase();
  });
  assert.deepEqual(results, [
    { id: "a", value: "A" },
    { id: "b", value: "B" },
    { id: "c", value: "C" },
  ]);
  assert.deepEqual(calls, ["run:a", "audit:a", "skip?:a", "notify:a", "run:b", "audit:b", "skip?:b", "run:c", "audit:c", "skip?:c", "notify:c"]);
  assert.equal(locks.held.size, 0);
});

test("a failing job still releases its lock and runs the listeners, then the error surfaces", async () => {
  const { createRunner, createLocks } = await load("../../src/jobs/runner.js");
  const locks = createLocks();
  const seen: string[] = [];
  const runner = createRunner({ locks, listeners: [(job: { id: string }) => void seen.push(job.id)] });
  await assert.rejects(
    runner.runAll([{ id: "x" }, { id: "y" }], async (job: { id: string }) => {
      if (job.id === "x") throw new Error("boom");
      return 1;
    }),
    /boom/,
  );
  assert.deepEqual(seen, ["x"]);
  assert.equal(locks.held.size, 0);
});
