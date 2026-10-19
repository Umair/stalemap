import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../../", import.meta.url));

async function run(cmd: string, args: string[]): Promise<void> {
  try {
    await promisify(execFile)(cmd, args, { cwd: root, timeout: 30_000 });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    assert.fail(`${[cmd, ...args].join(" ")} failed:\n${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
}

test("the build emits an ES module build and a CommonJS build", async () => {
  await rm(join(root, "dist"), { recursive: true, force: true });
  try {
    // The steps of `npm run build`.
    const tsc = join(root, "node_modules", ".bin", "tsc");
    await run(tsc, ["-p", "tsconfig.json"]);
    await run(tsc, ["-p", "tsconfig.cjs.json"]);
    await run(process.execPath, ["scripts/mark-cjs.mjs"]);

    const cjsEntry = join(root, "dist", "cjs", "index.js");
    assert.doesNotMatch(await readFile(cjsEntry, "utf8"), /^\s*(export|import)\s/m, "dist/cjs/index.js isn't CommonJS");
    const cjs = createRequire(join(root, "package.json"))(cjsEntry);
    assert.equal(cjs.parseDuration("1h30m"), 5_400_000);
    assert.equal(cjs.formatDuration(90_000), "1m 30s");

    const esm = await import(pathToFileURL(join(root, "dist", "esm", "index.js")).href);
    assert.equal(esm.parseDuration("45s"), 45_000);
  } finally {
    await rm(join(root, "dist"), { recursive: true, force: true });
  }
});
