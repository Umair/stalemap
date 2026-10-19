import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PackageReport } from "../src/analyze.ts";
import { guardFile, guardMessage, namesIdentifier, optionNames } from "../src/guard.ts";
import { checkProject, clearProjectTypeScriptCache, parseTscOutput, projectTypeScript } from "../src/projectts.ts";

// The guard keeps each project's last tsc errors in the cache, to tell new caller errors from old ones.
process.env.STALEMAP_CACHE = await mkdtemp(join(tmpdir(), "stalemap-projectts-cache-"));

async function project(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "stalemap-projectts-"));
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(dir, name, ".."), { recursive: true });
    await writeFile(join(dir, name), text);
  }
  return dir;
}

/**
 * A stand-in for TypeScript 7: its package exports only the version, and its `tsc` prints what the
 * real one does for a tsconfig with `baseUrl` (TS5102 and a hint line), or, once that's gone, the
 * code errors in `tsc-code.txt`.
 */
function nativeTypeScript(): Record<string, string> {
  const tsc = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const config = args[args.indexOf("-p") + 1];
const text = fs.readFileSync(config, "utf8");
if (/baseUrl/.test(text)) {
  process.stdout.write(config + "(4,5): error TS5102: Option 'baseUrl' has been removed. Please remove it from your configuration.\\n  Use '\\"paths\\": {\\"*\\": [\\"./src/*\\"]}' instead.\\n");
  process.exit(1);
}
const code = fs.existsSync("tsc-code.txt") ? fs.readFileSync("tsc-code.txt", "utf8") : "";
process.stdout.write(code);
process.exit(code ? 2 : 0);
`;
  return {
    "node_modules/typescript/package.json": JSON.stringify({ name: "typescript", version: "7.0.2", bin: { tsc: "./bin/tsc" }, exports: { ".": "./lib/version.cjs", "./package.json": "./package.json" } }),
    "node_modules/typescript/lib/version.cjs": `exports.version = "7.0.2"; exports.versionMajorMinor = "7.0";\n`,
    "node_modules/typescript/bin/tsc": tsc,
  };
}

function tsReport(changes: NonNullable<PackageReport["types"]>["changes"] = []): PackageReport {
  return {
    name: "typescript",
    status: "changed",
    pinned: "7.0.2",
    baseline: { version: "5.8.3", publishedAt: "" },
    major: true,
    used: true,
    usedNames: ["CompilerOptions", "CompilerOptions.baseUrl"],
    files: ["tsconfig.json"],
    changelog: { source: "GitHub releases", versions: ["7.0.2"], items: [] },
    types: { analyzed: ["."], noTypes: false, changes },
  };
}

test("tsc output is parsed with locations, unlocated errors and message chains", () => {
  const out = parseTscOutput(
    [
      "tsconfig.json(11,5): error TS5102: Option 'baseUrl' has been removed. Please remove it from your configuration.",
      "  Use '\"paths\": {\"*\": [\"./src/*\"]}' instead.",
      "error TS5023: Unknown compiler option 'foo'.",
      "src/a.ts(3,39): error TS2307: Cannot find module 'services/x' or its corresponding type declarations.",
      "",
      "Found 3 errors.",
    ].join("\n"),
    "/proj",
  );
  assert.equal(out.length, 3);
  assert.deepEqual(out[0], { file: "/proj/tsconfig.json", line: 11, column: 5, code: 5102, message: "Option 'baseUrl' has been removed. Please remove it from your configuration.", related: ["Use '\"paths\": {\"*\": [\"./src/*\"]}' instead."] });
  assert.deepEqual(out[1], { code: 5023, message: "Unknown compiler option 'foo'.", related: [] });
  assert.equal(out[2].file, "/proj/src/a.ts");
});

test("the project's TypeScript is used: the JS API when it has one, the CLI when it doesn't", async () => {
  const bundled = createRequire(import.meta.url).resolve("typescript");
  const withApi = await project({
    "package.json": JSON.stringify({ name: "app", devDependencies: { typescript: "6.9.0" } }),
    // Another version of the compiler API (the bundled one under a different version number).
    "node_modules/typescript/package.json": JSON.stringify({ name: "typescript", version: "6.9.0", main: "index.js", bin: { tsc: "./bin/tsc" } }),
    "node_modules/typescript/index.js": `module.exports = { ...require(${JSON.stringify(bundled)}), version: "6.9.0" };\n`,
    "node_modules/typescript/bin/tsc": "#!/usr/bin/env node\n",
    "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } } }),
  });
  const native = await project({ "package.json": JSON.stringify({ name: "app", devDependencies: { typescript: "7.0.2" } }), ...nativeTypeScript(), "tsconfig.json": "{}" });
  const absent = await project({ "package.json": JSON.stringify({ name: "app", devDependencies: { typescript: "5.8.3" } }) });
  clearProjectTypeScriptCache();
  assert.equal(projectTypeScript(withApi).via, "api");
  assert.equal(projectTypeScript(withApi).version, "6.9.0");
  assert.equal(projectTypeScript(native).via, "cli");
  assert.equal(projectTypeScript(absent, "5.8.3").via, "none", "another version, not installed: no rules to judge it by");

  const viaApi = await checkProject(withApi, join(withApi, "tsconfig.json"), { timeoutMs: 10_000 });
  assert.equal(viaApi?.source, "TypeScript 6.9.0");
  assert.ok(viaApi!.options.some((d) => d.code === 5101), JSON.stringify(viaApi));
});

test("on TypeScript 7 the guard runs the project's tsc and reports its option errors, then what a config fix leaves", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", devDependencies: { typescript: "7.0.2" } }),
    ...nativeTypeScript(),
    "tsconfig.json": `{\n  "compilerOptions": {\n    "strict": true,\n    "baseUrl": "./src",\n    "paths": { "@lib/*": ["lib/*"] }\n  }\n}\n`,
    "src/index.ts": `export const x = 1;\n`,
  });
  clearProjectTypeScriptCache();
  const report = tsReport([
    { subpath: ".", symbol: "CompilerOptions", kind: "members", detail: "`CompilerOptions` (now in `typescript/unstable/sync`): removed `baseUrl`, `outFile`", used: true, severity: 6, meta: { members: ["baseUrl", "outFile"] } },
  ]);
  for (const file of ["tsconfig.json", "src/index.ts"]) {
    const result = await guardFile({ cwd: dir, file, reports: [report] });
    const all = JSON.stringify(result?.findings, null, 2);
    assert.equal(result!.findings.length, 1, all);
    const [f] = result!.findings;
    assert.equal(f.pkg, "typescript");
    assert.equal(f.source, "tsc 7.0.2");
    assert.equal(f.where, "tsconfig.json:4");
    assert.match(f.problem, /^TS5102: Option 'baseUrl' has been removed\. .* Use '"paths": \{"\*": \["\.\/src\/\*"\]\}' instead\.$/);
    assert.match(f.hint ?? "", /`baseUrl` \(this project sets it\)/, "the note that names the option");
    const message = guardMessage(result, dir);
    assert.match(message, /the project's TypeScript reports errors/);
    assert.match(message, /- tsconfig\.json:4: TS5102: .*\(from the project's tsc 7\.0\.2\)/);
  }

  // The option is gone; the aliases it carried no longer resolve. A tsconfig edit gets the code errors too.
  await writeFile(join(dir, "tsconfig.json"), `{ "compilerOptions": { "strict": true, "paths": { "@lib/*": ["./src/lib/*"] } } }\n`);
  await writeFile(join(dir, "tsc-code.txt"), "src/index.ts(1,20): error TS2307: Cannot find module 'services/invoices' or its corresponding type declarations.\n");
  const after = await guardFile({ cwd: dir, file: "tsconfig.json", reports: [report] });
  assert.deepEqual(after!.findings.map((f) => [f.where, f.group, f.problem.slice(0, 7)]), [["src/index.ts:1", "config", "TS2307:"]]);
  assert.match(guardMessage(after, dir), /With these options, the project's tsc 7\.0\.2 reports in the code:\n- src\/index\.ts:1: TS2307/);

  // A code edit: stalemap can't check with the native compiler, so its errors in the edited file come
  // through, and new ones in files that import it. Files that don't import it are left alone.
  await writeFile(join(dir, "src/routes.ts"), `import { x } from "./index.js";\nexport const y = x;\n`);
  await writeFile(join(dir, "src/unrelated.ts"), `export const z = 1;\n`);
  await writeFile(
    join(dir, "tsc-code.txt"),
    [
      "src/index.ts(1,14): error TS2554: Expected 0 arguments, but got 3.",
      "src/routes.ts(2,1): error TS2554: Expected 0 arguments, but got 1.",
      "src/unrelated.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'.",
      "",
    ].join("\n"),
  );
  const code = await guardFile({ cwd: dir, file: "src/index.ts", reports: [report] });
  assert.deepEqual(code!.findings.map((f) => [f.line || f.where, f.group, f.problem]), [
    [1, undefined, "TS2554: Expected 0 arguments, but got 3."],
    ["src/routes.ts:2", "callers", "TS2554: Expected 0 arguments, but got 1."],
  ]);
  const shown = guardMessage(code, dir);
  assert.match(shown, /- line 1: TS2554: Expected 0 arguments, but got 3\. \(from the project's tsc 7\.0\.2\)/);
  assert.match(shown, /In files that import it, the project's tsc 7\.0\.2 now reports:\n- src\/routes\.ts:2: TS2554/);
  // The callers' errors were shown; the next edit doesn't repeat them, the edited file's still count.
  const again = await guardFile({ cwd: dir, file: "src/index.ts", reports: [report] });
  assert.deepEqual(again!.findings.map((f) => f.line || f.where), [1]);
});

test("a compiler-option error gets a note only when the note names that option (and value)", async () => {
  assert.deepEqual(optionNames("Option 'target=ES5' has been removed. Please remove it from your configuration."), { names: ["target"], values: ["ES5"] });
  assert.deepEqual(optionNames("Argument for '--module' option must be: 'commonjs', 'es2015'."), { names: ["module"], values: [] });
  assert.ok(namesIdentifier("`experimental.turbo` moved to `turbopack`", "turbo"));
  assert.ok(!namesIdentifier("Drop the `--turbopack` and `--turbo` flags", "turbo"), "a CLI flag isn't the config key");

  const dir = await project({
    "package.json": JSON.stringify({ name: "app", devDependencies: { typescript: "7.0.2" } }),
    ...nativeTypeScript(),
    "tsconfig.json": "{}\n",
    "tsc-code.txt": "",
  });
  await writeFile(
    join(dir, "node_modules/typescript/bin/tsc"),
    `#!/usr/bin/env node\nprocess.stdout.write("tsconfig.json(1,3): error TS5108: Option 'target=ES5' has been removed. Please remove it from your configuration.\\n"); process.exit(1);\n`,
  );
  await chmod(join(dir, "node_modules/typescript/bin/tsc"), 0o755);
  clearProjectTypeScriptCache();
  const unrelated = tsReport([{ subpath: ".", symbol: "CompilerOptions.target", kind: "deprecated", detail: "`CompilerOptions.target` is deprecated: use `ES2015` or later", used: true, severity: 6 }]);
  const onTarget = await guardFile({ cwd: dir, file: "tsconfig.json", reports: [unrelated] });
  assert.equal(onTarget!.findings[0].hint, undefined, "a note about `target` that doesn't name ES5 isn't the fix");
  const named = tsReport([{ subpath: ".", symbol: "ScriptTarget", kind: "members", detail: "`ScriptTarget`: removed `ES3`, `ES5`; `target` starts at `ES2015`", used: true, severity: 6, meta: { members: ["ES3", "ES5"] } }]);
  const withHint = await guardFile({ cwd: dir, file: "tsconfig.json", reports: [named] });
  assert.match(withHint!.findings[0].hint ?? "", /removed `ES3`, `ES5`/);
});
