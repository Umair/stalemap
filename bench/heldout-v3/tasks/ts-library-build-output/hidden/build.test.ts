import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("tsc -p tsconfig.json builds what package.json points at", async () => {
  await rm(join(root, "dist"), { recursive: true, force: true });
  try {
    let output = "";
    try {
      await promisify(execFile)(join(root, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.json"], { cwd: root, timeout: 30_000 });
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ""}${e.stderr ?? ""}` || String(err);
    }
    assert.equal(output, "", "the build fails");
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    assert.ok(existsSync(join(root, pkg.types)), `${pkg.types} was not emitted`);
    assert.ok(existsSync(join(root, pkg.main)), `${pkg.main} was not emitted`);
    const built = await import(pathToFileURL(join(root, pkg.main)).href);
    assert.equal(built.slugify("Crème Brûlée: 3 Ways!"), "creme-brulee-3-ways");
    assert.equal(built.truncateWords("one two three four", 2), "one two…");
    const declarations = await readFile(join(root, pkg.types), "utf8");
    assert.match(declarations, /slugify/);
    assert.match(declarations, /truncateWords/);
  } finally {
    await rm(join(root, "dist"), { recursive: true, force: true });
  }
});
