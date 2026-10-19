import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript-6";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

const attrs = (s: string): Record<string, string> =>
  Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v.replace(/&quot;/g, '"').replace(/&amp;/g, "&")]));

/** The root <svg> attributes and the [tag, attributes] of every element inside it. */
function parse(html: string): { svg: Record<string, string>; shapes: [string, Record<string, string>][] } {
  const m = /^<svg([^>]*)>([\s\S]*)<\/svg>$/.exec(html);
  assert.ok(m, `renders a single <svg>: ${html}`);
  const shapes = [...m[2].matchAll(/<([a-zA-Z]+)([^>]*?)\/?>/g)].map(([, tag, a]): [string, Record<string, string>] => [tag, attrs(a)]);
  return { svg: attrs(m[1]), shapes };
}

const sourdough = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3">
  <path d="M4 15c0-5 3.6-9 8-9s8 4 8 9v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
  <path d="m9 10 1.5 2" />
  <path d="m15 10-1.5 2" />
  <circle cx="12" cy="15" r="1" />
</svg>`;
const sourdoughShapes = [
  ["path", { d: "M4 15c0-5 3.6-9 8-9s8 4 8 9v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" }],
  ["path", { d: "m9 10 1.5 2" }],
  ["path", { d: "m15 10-1.5 2" }],
  ["circle", { cx: "12", cy: "15", r: "1" }],
];
const kettlebell = `<svg viewBox="0 0 24 24"><rect x="5" y="9" width="14" height="12" rx="6"/><line x1="8" y1="3" x2="16" y2="3"/><polyline points="8 3 7 9"/><polyline points="16 3 17 9"/></svg>`;
const kettlebellShapes = [
  ["rect", { x: "5", y: "9", width: "14", height: "12", rx: "6" }],
  ["line", { x1: "8", y1: "3", x2: "16", y2: "3" }],
  ["polyline", { points: "8 3 7 9" }],
  ["polyline", { points: "16 3 17 9" }],
];

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
      // A JSX attribute resolves to the prop it sets on the component.
      if (node && ts.isJsxAttribute(node.parent)) symbol = checker.getContextualType(node.parent.parent)?.getProperty(node.parent.name.getText(sf)) ?? symbol;
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      const declarations = symbol ? checker.getRootSymbols(symbol).flatMap((s) => s.declarations ?? []) : [];
      if (declarations.some((decl) => /node_modules[\\/]lucide-react[\\/]/.test(decl.getSourceFile().fileName)))
        uses.push(`${file.slice(root.length)}: ${sf.text.slice(d.start, d.start + (d.length ?? 0))}`);
    }
  }
  return uses;
}

test("uploaded icons render their shapes like built-in icons", async () => {
  const { iconFromSvg } = await load("../../src/icons/fromSvg.ts");
  for (const [name, svg, shapes] of [["sourdough", sourdough, sourdoughShapes], ["kettlebell", kettlebell, kettlebellShapes]] as const) {
    const Icon = iconFromSvg(name, svg);
    const plain = parse(renderToStaticMarkup(createElement(Icon)));
    assert.deepEqual(plain.shapes, shapes, `${name}: draws the uploaded shapes`);
    assert.equal(plain.svg.width, "24", `${name}: default size`);
    assert.equal(plain.svg.height, "24", `${name}: default size`);
    assert.equal(plain.svg.viewBox, "0 0 24 24", name);
    assert.equal(plain.svg.stroke, "currentColor", `${name}: default color`);
    assert.equal(plain.svg["stroke-width"], "2", `${name}: default stroke width`);
    assert.equal(plain.svg.fill, "none", name);

    const styled = parse(renderToStaticMarkup(createElement(Icon, { size: 40, color: "#e11d48", strokeWidth: 1.5, className: "category-icon" })));
    assert.deepEqual(styled.shapes, shapes, `${name}: draws the uploaded shapes when styled`);
    assert.equal(styled.svg.width, "40", `${name}: size`);
    assert.equal(styled.svg.height, "40", `${name}: size`);
    assert.equal(styled.svg.stroke, "#e11d48", `${name}: color`);
    assert.equal(styled.svg["stroke-width"], "1.5", `${name}: strokeWidth`);
    assert.match(styled.svg.class ?? "", /(^| )category-icon( |$)/, `${name}: className`);
  }
});

test("no deprecated lucide-react APIs", () => {
  assert.deepEqual(deprecatedLucideUses(), []);
});
