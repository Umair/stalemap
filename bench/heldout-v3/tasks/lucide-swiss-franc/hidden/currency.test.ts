import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as Lucide from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript-6";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
const lucide = Lucide as Record<string, unknown>;

/** Uses of lucide-react symbols that TypeScript reports as deprecated (suggestion diagnostics 6385/6387) in src/. */
function deprecatedLucideUses(): string[] {
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
      if (symbol?.declarations?.some((decl) => /node_modules[\\/]lucide-react[\\/]/.test(decl.getSourceFile().fileName)))
        uses.push(`${file.slice(root.length)}: ${sf.text.slice(d.start, d.start + (d.length ?? 0))}`);
    }
  }
  return uses;
}

test("CHF prices show a currency icon", async () => {
  const { PriceTag } = await load("../../src/PriceTag.tsx");
  const { currencyIcon } = await load("../../src/currency.tsx");
  const html = renderToStaticMarkup(createElement(PriceTag, { amount: 12.5, currency: "CHF" }));
  assert.match(html, /<svg[^>]*class="lucide[ "]/, "the CHF price tag renders a lucide icon");
  assert.match(html, /12\.50/);
  const chf = currencyIcon("CHF");
  for (const other of ["USD", "EUR", "GBP", "JPY"]) assert.notEqual(chf, currencyIcon(other), `CHF shows the ${other} icon`);
  assert.equal(currencyIcon("USD"), Lucide.DollarSign, "USD keeps its icon");
  assert.equal(currencyIcon("EUR"), Lucide.Euro, "EUR keeps its icon");
  for (const name of ["SwissFranc", "BadgeSwissFranc", "ReceiptSwissFranc"]) assert.notEqual(chf, lucide[name], `CHF uses the deprecated ${name} icon`);
});

test("no deprecated lucide-react APIs", () => {
  assert.deepEqual(deprecatedLucideUses(), []);
});
