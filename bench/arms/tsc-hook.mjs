#!/usr/bin/env node
/**
 * The `tsc-hook` arm (exploratory): the plain alternative to stalemap's guard, a PostToolUse hook any
 * project can add in a few lines. After each Write/Edit it runs the workspace's own
 * `tsc --noEmit -p tsconfig.json` and shows the agent every error, through the same channel the guard
 * uses (PostToolUse `additionalContext`). No notes, no hints, no filtering to dependency APIs.
 *
 * TSC_HOOK_LOG names a JSON-lines file that gets one line per run, `{ file, findings, ms }`, read the
 * same way as the guard's log.
 */
import { execFile } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const MAX_ERRORS = 20;

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  // no input: check the working directory anyway
}
const cwd = input.cwd || process.cwd();
const file = input.tool_input?.file_path;
const started = Date.now();

execFile(join(cwd, "node_modules", ".bin", "tsc"), ["--noEmit", "-p", "tsconfig.json"], { cwd, timeout: 50_000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
  const errors = String(stdout ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /error TS\d+:/.test(l));
  // tsc exits non-zero when it reports errors; anything else (no tsc, a timeout) must not pass for "no errors".
  const failed = err && !errors.length ? (err.killed ? "tsc timed out" : String(err.code ?? err.message)) : undefined;
  if (process.env.TSC_HOOK_LOG) {
    appendFileSync(process.env.TSC_HOOK_LOG, JSON.stringify({ file: file ?? null, findings: errors.length, ms: Date.now() - started, ...(failed ? { error: failed } : {}) }) + "\n");
  }
  if (!errors.length) return;
  const edited = file ? `\`${relative(cwd, file) || file}\`` : "this edit";
  const more = errors.length > MAX_ERRORS ? `\n- …and ${errors.length - MAX_ERRORS} more` : "";
  const context = `\`tsc --noEmit\` reports ${errors.length} error${errors.length === 1 ? "" : "s"} after ${edited}:\n${errors
    .slice(0, MAX_ERRORS)
    .map((e) => `- ${e}`)
    .join("\n")}${more}`;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } }) + "\n");
});
