import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const hookScript = join(import.meta.dirname, "..", "bench", "arms", "tsc-hook.mjs");

function runHook(cwd: string, file: string, log: string): Promise<string> {
  return new Promise((done, fail) => {
    const child = execFile(process.execPath, [hookScript], { env: { ...process.env, TSC_HOOK_LOG: log } }, (err, stdout) => (err ? fail(err) : done(stdout)));
    child.stdin!.end(JSON.stringify({ cwd, hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: file } }));
  });
}

test("the tsc-hook arm shows the agent tsc's errors after an edit, and nothing when it compiles", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tsc-hook-"));
  await mkdir(join(dir, "src"));
  await symlink(join(import.meta.dirname, "..", "node_modules"), join(dir, "node_modules"), "dir");
  await writeFile(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true, types: [] }, include: ["src"] }));
  const file = join(dir, "src", "a.ts");
  const log = join(dir, "hook.jsonl");

  await writeFile(file, `export const n: number = "one";\n`);
  const out = JSON.parse(await runHook(dir, file, log)) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } };
  assert.equal(out.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /^`tsc --noEmit` reports 1 error after `src\/a\.ts`:\n- src\/a\.ts\(1,14\): error TS2322/);

  await writeFile(file, `export const n: number = 1;\n`);
  assert.equal(await runHook(dir, file, log), "");

  const lines = (await readFile(log, "utf8")).trim().split("\n").map((l) => JSON.parse(l) as { findings: number });
  assert.deepEqual(lines.map((l) => l.findings), [1, 0]);

  // A workspace without tsc is logged as a failure, not as a clean check.
  const bare = await mkdtemp(join(tmpdir(), "tsc-hook-bare-"));
  assert.equal(await runHook(bare, join(bare, "a.ts"), log), "");
  const last = JSON.parse((await readFile(log, "utf8")).trim().split("\n").pop()!) as { findings: number; error?: string };
  assert.equal(last.findings, 0);
  assert.equal(last.error, "ENOENT");
});
