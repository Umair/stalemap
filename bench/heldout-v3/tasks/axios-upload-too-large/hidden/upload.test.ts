import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript-6";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

const statusFor: Record<string, number> = { "huge.mov": 413, "anon.txt": 401, "broken.bin": 500 };
const server = http.createServer((req, res) => {
  req.resume();
  req.on("end", () => {
    const name = decodeURIComponent((req.url ?? "").replace(/^\/files\//, ""));
    const status = statusFor[name] ?? 201;
    const body = status === 201 ? JSON.stringify({ id: "f1", url: `https://files.example.com/${name}` }) : JSON.stringify({ error: `status ${status}` });
    res.writeHead(status, { "content-type": "application/json" });
    res.end(body);
  });
});
let mod: any;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.UPLOADS_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  mod = await load("../../src/upload.ts");
});
after(() => server.close());

/** Uses of the deprecated HttpStatusCode.PayloadTooLarge that TypeScript reports (suggestion diagnostics 6385/6387) in src/. */
function deprecatedAxiosUses(): string[] {
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
      if (symbol?.name === "PayloadTooLarge" && symbol.declarations?.some((decl) => /node_modules[\\/]axios[\\/]/.test(decl.getSourceFile().fileName)))
        uses.push(`${file.slice(root.length)}: ${sf.text.slice(d.start, d.start + (d.length ?? 0))}`);
    }
  }
  return uses;
}

test("an upload the server rejects as too large throws FileTooLargeError", async () => {
  await assert.rejects(mod.uploadFile("huge.mov", Buffer.from("x")), (err: any) => {
    assert.ok(err instanceof mod.FileTooLargeError, `expected FileTooLargeError, got ${err?.name}: ${err?.message}`);
    assert.equal(err.fileName, "huge.mov");
    return true;
  });
});

test("other outcomes are unchanged", async () => {
  assert.deepEqual(await mod.uploadFile("photo.jpg", Buffer.from("x")), { id: "f1", url: "https://files.example.com/photo.jpg" });
  await assert.rejects(mod.uploadFile("anon.txt", Buffer.from("x")), (err: any) => err instanceof mod.NotSignedInError);
  await assert.rejects(mod.uploadFile("broken.bin", Buffer.from("x")), (err: any) => {
    assert.ok(!(err instanceof mod.FileTooLargeError) && !(err instanceof mod.NotSignedInError), "a 500 is not reported as a size or sign-in problem");
    assert.equal(err?.response?.status, 500);
    return true;
  });
});

test("no deprecated axios status codes", () => {
  assert.deepEqual(deprecatedAxiosUses(), []);
});
