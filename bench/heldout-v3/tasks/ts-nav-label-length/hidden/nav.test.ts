import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as nav from "../../src/nav.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const isValidLabel = (nav as Record<string, any>).isValidLabel as (label: string) => boolean;

const labels = [
  "Home",
  "Twelve chars",
  "Thirteen char",
  "Account settings",
  "Café crème",
  "🔥 Deals",
  "🌍 Worldwide",
  "🎁 Gift cards",
  "🎁 Gift cards!",
  "🚀🚀🚀🚀🚀🚀",
  "🚀🚀🚀🚀🚀🚀🚀",
  "🛒🛒🛒🛒🛒🛒🛒🛒🛒🛒🛒🛒",
  "🛒🛒🛒🛒🛒🛒🛒🛒🛒🛒🛒🛒🛒",
];

test("runtime check: at most 12 characters", () => {
  assert.equal(isValidLabel("Home"), true);
  assert.equal(isValidLabel("Twelve chars"), true);
  assert.equal(isValidLabel("Thirteen char"), false);
  assert.equal(isValidLabel("Account settings"), false);
});

test("the compile-time check accepts exactly the labels the runtime check accepts", async () => {
  // Type-check calls to navItem() with the project's TypeScript: each label the runtime check rejects must be a
  // compile error, and each one it accepts must compile.
  const lines = ['import { navItem } from "../src/nav.ts";'];
  for (const label of labels) {
    if (!isValidLabel(label)) lines.push("// @ts-expect-error");
    lines.push(`navItem(${JSON.stringify(label)}, "/x");`);
  }
  const dir = await mkdtemp(join(root, ".probe-"));
  try {
    await writeFile(join(dir, "probe.ts"), lines.join("\n") + "\n");
    const compilerOptions = { strict: true, noEmit: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler", allowImportingTsExtensions: true, skipLibCheck: true, types: ["node"] };
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions, files: ["probe.ts"] }));
    let output = "";
    try {
      await promisify(execFile)(join(root, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.json"], { cwd: dir, timeout: 30_000 });
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ""}${e.stderr ?? ""}` || String(err);
    }
    assert.equal(output, "", `compile-time and runtime checks disagree:\n${lines.join("\n")}\n${output}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
