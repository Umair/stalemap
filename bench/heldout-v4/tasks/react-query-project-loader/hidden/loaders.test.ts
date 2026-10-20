import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { readdirSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { QueryClient } from "@tanstack/react-query";
import ts from "typescript-6";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

const projects: Record<string, { id: string; name: string; owner: string }> = {
  p1: { id: "p1", name: "Apollo", owner: "ana" },
  p2: { id: "p2", name: "Gemini", owner: "ben" },
};
const requests: string[] = [];
let server: Server;

before(async () => {
  server = createServer((req, res) => {
    requests.push(req.url ?? "");
    const id = decodeURIComponent((req.url ?? "").replace(/^\/projects\//, ""));
    const project = projects[id];
    res.writeHead(project ? 200 : 404, { "content-type": "application/json" });
    res.end(JSON.stringify(project ?? { error: "not found" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Uses of @tanstack query symbols that TypeScript reports as deprecated (suggestion diagnostics 6385/6387) in src/. */
function deprecatedQueryUses(): string[] {
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
      if (symbol?.declarations?.some((decl) => /node_modules[\\/]@tanstack[\\/]/.test(decl.getSourceFile().fileName)))
        uses.push(`${file.slice(root.length)}: ${sf.text.slice(d.start, d.start + (d.length ?? 0))}`);
    }
  }
  return uses;
}

test("fetches and caches a project that isn't cached yet", async () => {
  const { projectLoader } = await load("../../src/loaders.ts");
  const client = newClient();
  requests.length = 0;
  assert.deepEqual(await projectLoader(client, "p1"), projects.p1);
  assert.deepEqual(requests, ["/projects/p1"]);
  assert.deepEqual(client.getQueryData(["project", "p1"]), projects.p1, "the project is cached");
  assert.deepEqual(await projectLoader(client, "p1"), projects.p1);
  assert.deepEqual(requests, ["/projects/p1"], "a second load reuses the cached project");
  client.clear();
});

test("returns the cached project without fetching", async () => {
  const { projectLoader } = await load("../../src/loaders.ts");
  const client = newClient();
  const cached = { id: "p2", name: "Gemini (cached)", owner: "ben" };
  client.setQueryData(["project", "p2"], cached, { updatedAt: Date.now() - 60 * 60 * 1000 });
  requests.length = 0;
  assert.deepEqual(await projectLoader(client, "p2"), cached);
  assert.deepEqual(requests, [], "no request for a cached project");
  client.clear();
});

test("no deprecated @tanstack APIs", () => {
  assert.deepEqual(deprecatedQueryUses(), []);
});
