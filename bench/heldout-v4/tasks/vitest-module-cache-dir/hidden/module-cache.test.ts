import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

function capture() {
  let text = "";
  const stream = new Writable({
    write(chunk, _enc, cb) {
      text += String(chunk);
      cb();
    },
  });
  return { stream, read: () => text };
}

test("transformed modules are cached in .cache/vitest-modules, without config warnings", async () => {
  const root = process.cwd();
  const cacheDir = join(root, ".cache", "vitest-modules");
  rmSync(join(root, ".cache"), { recursive: true, force: true });

  const out = capture();
  const err = capture();
  const { startVitest } = await load("vitest/node");
  const vitest = await startVitest(
    "test",
    [],
    { root, watch: false, cache: false },
    { cacheDir: mkdtempSync(join(tmpdir(), "vite-cache-")) },
    { stdout: out.stream, stderr: err.stream },
  );
  try {
    assert.equal(vitest.state.getFiles().length, 1, "expected src/pricing/discounts.test.ts to run");
    assert.equal(vitest.state.getCountOfFailedTests(), 0, "the project's tests failed");
  } finally {
    await vitest.close();
  }

  assert.ok(existsSync(cacheDir) && readdirSync(cacheDir).length > 0, ".cache/vitest-modules was not populated");
  const log = out.read() + err.read();
  assert.doesNotMatch(log, /deprecat/i, `Vitest printed a deprecation warning:\n${log}`);
});
