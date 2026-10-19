import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Camera, Inbox, Settings, Star } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript-6";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

const attrs = (s: string): Record<string, string> => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));

/** Each <svg> in the markup with the on-screen stroke width of every shape it draws (vector-effect is not inherited). */
function icons(html: string): { width: number; height: number; strokes: number[] }[] {
  return [...html.matchAll(/<svg([^>]*)>([\s\S]*?)<\/svg>/g)].map(([, svgAttrs, inner]) => {
    const svg = attrs(svgAttrs);
    const viewBoxWidth = Number((svg.viewBox ?? "0 0 24 24").trim().split(/[\s,]+/)[2]);
    const scale = Number(svg.width) / viewBoxWidth;
    const strokes = [...inner.matchAll(/<(?:path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*?)\/?>/g)].map(([, shapeAttrs]) => {
      const shape = attrs(shapeAttrs);
      const width = Number(shape["stroke-width"] ?? svg["stroke-width"]);
      return shape["vector-effect"] === "non-scaling-stroke" ? width : width * scale;
    });
    return { width: Number(svg.width), height: Number(svg.height), strokes };
  });
}

function assertCrisp(html: string, size: number, what: string) {
  const found = icons(html);
  assert.equal(found.length, 1, `${what}: renders one icon`);
  const [icon] = found;
  assert.equal(icon.width, size, `${what}: displayed ${size}px wide`);
  assert.equal(icon.height, size, `${what}: displayed ${size}px high`);
  assert.ok(icon.strokes.length > 0, `${what}: draws shapes`);
  for (const stroke of icon.strokes) assert.ok(Math.abs(stroke - 1.5) < 1e-6, `${what}: stroke is ${stroke}px on screen, not 1.5px`);
}

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

test("AppIcon strokes are 1.5px on screen at every size", async () => {
  const { AppIcon } = await load("../../src/icons/AppIcon.tsx");
  for (const icon of [Camera, Settings, Star])
    for (const size of [12, 16, 20, 24, 32, 48, 64, 96])
      assertCrisp(renderToStaticMarkup(createElement(AppIcon, { icon, size })), size, `${icon.displayName ?? "icon"} at ${size}px`);
  assertCrisp(renderToStaticMarkup(createElement(AppIcon, { icon: Camera })), 24, "default size");
  const labelled = renderToStaticMarkup(createElement(AppIcon, { icon: Star, size: 40, className: "fav", "aria-label": "Favourite" }));
  assertCrisp(labelled, 40, "labelled icon");
  assert.match(labelled, /class="[^"]*\bfav\b/, "className is passed through");
  assert.match(labelled, /aria-label="Favourite"/, "props are passed through");
});

test("icons in the app's components are 1.5px on screen", async () => {
  const { NavLink } = await load("../../src/components/NavLink.tsx");
  const { EmptyState } = await load("../../src/components/EmptyState.tsx");
  const nav = renderToStaticMarkup(createElement(NavLink, { href: "/inbox", icon: Inbox, children: "Inbox" }));
  assertCrisp(nav, 16, "NavLink");
  assert.match(nav, /href="\/inbox"/);
  const empty = renderToStaticMarkup(createElement(EmptyState, { title: "Nothing here", hint: "New messages show up here." }));
  assertCrisp(empty, 64, "EmptyState");
  assert.match(empty, /class="[^"]*\bempty-state__icon\b/);
  assert.match(empty, /Nothing here/);
});

test("no deprecated lucide-react APIs", () => {
  assert.deepEqual(deprecatedLucideUses(), []);
});
