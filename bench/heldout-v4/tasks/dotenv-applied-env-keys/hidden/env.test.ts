import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { applyEnvFile } = await load("../../src/env.ts");
const { loadEnvFiles } = await load("../../src/startup.ts");

const dir = mkdtempSync(join(tmpdir(), "env-keys-"));
const file = (name: string, text: string) => {
  const p = join(dir, name);
  writeFileSync(p, text);
  return p;
};

test("returns only the variables it set, and leaves existing ones alone", () => {
  const f = file("a.env", "DATABASE_URL=postgres://localhost/app\nPORT=4000\n# comment\nGREETING=\"hello world\"\n");
  const target: Record<string, string | undefined> = { PORT: "8080" };
  const applied = applyEnvFile(f, target);
  assert.deepEqual({ ...applied }, { DATABASE_URL: "postgres://localhost/app", GREETING: "hello world" });
  assert.deepEqual(target, { PORT: "8080", DATABASE_URL: "postgres://localhost/app", GREETING: "hello world" });
});

test("a second file only adds what is still missing", () => {
  const target: Record<string, string | undefined> = {};
  applyEnvFile(file("b1.env", "A=1\nB=2\n"), target);
  const applied = applyEnvFile(file("b2.env", "B=20\nC=30\n"), target);
  assert.deepEqual({ ...applied }, { C: "30" });
  assert.deepEqual(target, { A: "1", B: "2", C: "30" });
});

test("defaults to process.env", () => {
  const key = `ENV_KEYS_TEST_${process.pid}`;
  delete process.env[key];
  const applied = applyEnvFile(file("c.env", `${key}=yes\n`));
  assert.equal(process.env[key], "yes");
  assert.deepEqual({ ...applied }, { [key]: "yes" });
  delete process.env[key];
});

test("startup lines list what each file set", () => {
  const target: Record<string, string | undefined> = { HOME_DIR: "/srv" };
  const lines = loadEnvFiles([file("d1.env", "API_KEY=abc123\nHOME_DIR=/tmp\n"), file("d2.env", "HOME_DIR=/x\n")], target);
  assert.deepEqual(lines, [`${join(dir, "d1.env")}: API_KEY (6 chars)`, `${join(dir, "d2.env")}: nothing new`]);
});
