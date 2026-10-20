import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

test("attachments from every package land in test-artifacts/ at the root", async () => {
  const root = process.cwd();
  const artifacts = join(root, "test-artifacts");
  rmSync(artifacts, { recursive: true, force: true });

  const { startVitest } = await load("vitest/node");
  const vitest = await startVitest(
    "test",
    [],
    { root, watch: false, cache: false, fsModuleCache: false, reporters: [] },
    { cacheDir: mkdtempSync(join(tmpdir(), "vite-cache-")) },
  );
  try {
    const files = vitest.state.getFiles();
    assert.equal(files.length, 2, "expected the api and web test files to run");
    assert.equal(vitest.state.getCountOfFailedTests(), 0, "the package tests failed");
  } finally {
    await vitest.close();
  }

  const contents = filesUnder(artifacts).map((f) => readFileSync(f, "utf8"));
  assert.ok(contents.some((c) => c.includes('"project":"api"')), `no api attachment in test-artifacts/ (found ${contents.length} files)`);
  assert.ok(contents.some((c) => c.includes("project: web")), `no web attachment in test-artifacts/ (found ${contents.length} files)`);
});
