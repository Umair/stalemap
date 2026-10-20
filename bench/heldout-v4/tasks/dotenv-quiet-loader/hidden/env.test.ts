import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { loadEnv } = await load("../../src/env.ts");

const dir = mkdtempSync(join(tmpdir(), "quiet-env-"));
let n = 0;
const KNOBS = ["DOTENV_CONFIG_QUIET", "DOTENV_CONFIG_DEBUG", "DOTENV_QUIET", "DOTENV_DEBUG"];
const created: string[] = [];

/** Writes a fresh env file, loads it and returns everything printed to the console meanwhile. */
function loadCapturing(knobs: Record<string, string>): { output: string; key: string } {
  const key = `QUIET_ENV_TEST_${process.pid}_${n++}`;
  created.push(key);
  const file = join(dir, `${key}.env`);
  writeFileSync(file, `${key}=loaded\nQUIET_ENV_SHARED=from-file\n`);
  for (const k of KNOBS) delete process.env[k];
  Object.assign(process.env, knobs);
  const lines: string[] = [];
  const methods = ["log", "info", "warn", "error", "debug"] as const;
  const saved = methods.map((m) => console[m]);
  for (const m of methods) console[m] = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
  try {
    loadEnv(file);
  } finally {
    methods.forEach((m, i) => (console[m] = saved[i]));
  }
  return { output: lines.join("\n"), key };
}

afterEach(() => {
  for (const k of [...KNOBS, ...created, "QUIET_ENV_SHARED"]) delete process.env[k];
});

test("loads the file without printing anything by default", () => {
  process.env.QUIET_ENV_SHARED = "from-shell";
  const { output, key } = loadCapturing({});
  assert.equal(process.env[key], "loaded");
  assert.equal(process.env.QUIET_ENV_SHARED, "from-shell", "an existing variable keeps its value");
  assert.equal(output, "");
});

test("DOTENV_CONFIG_QUIET=true stays quiet", () => {
  const { output, key } = loadCapturing({ DOTENV_CONFIG_QUIET: "true" });
  assert.equal(process.env[key], "loaded");
  assert.equal(output, "");
});

test("DOTENV_CONFIG_QUIET=false turns the output on", () => {
  const { output, key } = loadCapturing({ DOTENV_CONFIG_QUIET: "false" });
  assert.equal(process.env[key], "loaded");
  assert.notEqual(output, "", "something is printed about the load");
});

test("DOTENV_CONFIG_DEBUG=true turns the output on", () => {
  const { output, key } = loadCapturing({ DOTENV_CONFIG_DEBUG: "true" });
  assert.equal(process.env[key], "loaded");
  assert.notEqual(output, "", "something is printed about the load");
});
