import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript-6";
const root = fileURLToPath(new URL("../../", import.meta.url));
const here = fileURLToPath(new URL(".", import.meta.url));
const load = (id: string): Promise<any> => import(id);

/** Uses of @jest/source-map symbols that TypeScript reports as deprecated (suggestion diagnostics 6385/6387) in src/. */
function deprecatedSourceMapUses(): string[] {
  const files = readdirSync(join(root, "src"), { recursive: true }).map(String).filter((f) => /\.[cm]?tsx?$/.test(f)).map((f) => join(root, "src", f));
  const config = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
  const options = config?.options ?? {};
  const service = ts.createLanguageService({
    getScriptFileNames: () => files,
    getScriptVersion: () => "1",
    getScriptSnapshot: (f) => (ts.sys.fileExists(f) ? ts.ScriptSnapshot.fromString(ts.sys.readFile(f) ?? "") : undefined),
    getCurrentDirectory: () => root,
    getCompilationSettings: () => options,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  });
  const program = service.getProgram()!;
  const checker = program.getTypeChecker();
  const uses: string[] = [];
  for (const file of files) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    for (const d of service.getSuggestionDiagnostics(file)) {
      if ((d.code !== 6385 && d.code !== 6387) || d.start === undefined) continue;
      const at = (node: ts.Node): ts.Node | undefined =>
        node.getStart(sf) <= d.start! && d.start! < node.getEnd() ? (ts.forEachChild(node, at) ?? node) : undefined;
      const node = at(sf);
      let symbol = node && checker.getSymbolAtLocation(node);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      if (symbol?.declarations?.some((decl) => /node_modules[\\/]@jest[\\/]source-map[\\/]/.test(decl.getSourceFile().fileName)))
        uses.push(`${file.slice(root.length)}: ${sf.text.slice(d.start, d.start + (d.length ?? 0))}`);
    }
  }
  return uses;
}

test("fixturePath() resolves next to the calling file", async () => {
  const { fixturePath, readJson } = await load("../../src/testing/fixtures.ts");
  mkdirSync(join(here, "__fixtures__"), { recursive: true });
  writeFileSync(join(here, "__fixtures__", "order.json"), JSON.stringify({ id: 7, items: ["mug"] }));
  const path = fixturePath("order.json");
  assert.equal(path, join(here, "__fixtures__", "order.json"));
  assert.deepEqual(readJson(path), { id: 7, items: ["mug"] });
  assert.equal(fixturePath("users/admin.json"), join(here, "__fixtures__", "users", "admin.json"));
});

test("fixturePath() follows the caller into other folders", async () => {
  // A helper module in another folder that looks up its own fixture.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "fixture-caller-")));
  const helper = join(dir, "orders.mjs");
  const fixtures = pathToFileURL(join(root, "src", "testing", "fixtures.ts")).href;
  writeFileSync(helper, `import { fixturePath } from ${JSON.stringify(fixtures)};\nexport function orderPath() {\n  return fixturePath("order.json");\n}\n`);
  const { orderPath } = await load(pathToFileURL(helper).href);
  assert.equal(orderPath(), join(dir, "__fixtures__", "order.json"));
});

test("no deprecated @jest/source-map APIs", () => {
  assert.deepEqual(deprecatedSourceMapUses(), []);
});
