import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as lib from "../../src/index.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { slugify, truncate } = lib as Record<string, any>;

test("the helpers still work", () => {
  assert.equal(slugify("Héllo, Wörld! Café"), "hello-world-cafe");
  assert.equal(truncate("abcdefghij", 6), "abcde…");
});

test("the build compiles and dist/index.js loads with require()", async () => {
  const outDir = await mkdtemp(join(root, ".build-"));
  try {
    let output = "";
    try {
      await promisify(execFile)(join(root, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.json", "--outDir", outDir, "--noEmit", "false"], { cwd: root, timeout: 30_000 });
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ""}${e.stderr ?? ""}` || String(err);
    }
    assert.equal(output, "", "tsc -p tsconfig.json fails");
    // What scripts/mark-cjs.mjs does for dist/ in `npm run build`.
    await writeFile(join(outDir, "package.json"), JSON.stringify({ type: "commonjs" }));
    const required = createRequire(join(outDir, "consumer.js"))(join(outDir, "index.js"));
    assert.equal(required.slugify("Héllo, Wörld! Café", { separator: "_" }), "hello_world_cafe");
    assert.equal(required.stripAccents("Ångström"), "Angstrom");
    assert.equal(required.truncate("The quick brown fox", 10), "The quick…");
    assert.match(await readFile(join(outDir, "index.d.ts"), "utf8"), /\bslugify\b/, "type declarations are still emitted");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
