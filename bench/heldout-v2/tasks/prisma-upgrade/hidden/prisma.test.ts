import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const url = "postgresql://bench:secret@db.example.com:5432/shop";
const load = (id: string): Promise<any> => import(id);
test("prisma validate accepts the project", () => {
  const env = { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1" };
  try {
    execFileSync(join(root, "node_modules", ".bin", "prisma"), ["validate"], { cwd: root, env, encoding: "utf8", stdio: "pipe", timeout: 60_000 });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    assert.fail(`prisma validate failed:\n${e.stderr ?? ""}${e.stdout ?? ""}`);
  }
});
test("the connection string comes from DATABASE_URL", async () => {
  process.env.DATABASE_URL = url;
  const { loadConfigFromFile } = await load("@prisma/config");
  const { config, error } = await loadConfigFromFile({ configRoot: root });
  assert.equal(error, undefined, JSON.stringify(error));
  assert.equal(config?.datasource?.url, url);
});
test("same PostgreSQL models", () => {
  const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.match(schema, /model User \{/);
  assert.match(schema, /model Post \{/);
});
