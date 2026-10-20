import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript-6";
import { z } from "zod";
import { defineJob } from "../../src/jobs.ts";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

// The handler's payload is typed from the schema's output.
const typed = defineJob("typed", z.object({ at: z.coerce.date(), count: z.number() }), async (payload) => {
  const at: Date = payload.at;
  const count: number = payload.count;
  // @ts-expect-error the payload has no such field
  void payload.missing;
  void at;
  void count;
});
void typed;

/** Uses of zod symbols that TypeScript reports as deprecated (suggestion diagnostics 6385/6387) in src/. */
function deprecatedZodUses(): string[] {
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
      if (symbol?.declarations?.some((decl) => /node_modules[\\/]zod[\\/]/.test(decl.getSourceFile().fileName)))
        uses.push(`${file.slice(root.length)}: ${sf.text.slice(d.start, d.start + (d.length ?? 0))}`);
    }
  }
  return uses;
}

test("run validates the payload and passes the parsed output to the handler", async () => {
  const seen: unknown[] = [];
  const job = defineJob("resize", z.object({ id: z.string(), width: z.coerce.number().int().positive() }), async (p) => {
    seen.push(p);
  });
  assert.equal(job.name, "resize");
  await job.run({ id: "img_1", width: "640" });
  assert.deepEqual(seen, [{ id: "img_1", width: 640 }]);
  await assert.rejects(job.run({ id: "img_2", width: -1 }));
  await assert.rejects(job.run({ width: 10 }));
  assert.equal(seen.length, 1, "the handler doesn't run on invalid data");
});

test("works with non-object schemas and transforms", async () => {
  const seen: unknown[] = [];
  const job = defineJob("tags", z.array(z.string().trim().toLowerCase()).min(1), async (p) => {
    seen.push(p);
  });
  await job.run([" News ", "SPORT"]);
  assert.deepEqual(seen, [["news", "sport"]]);
  await assert.rejects(job.run([]));
});

test("the welcome email job still works", async () => {
  const { sendWelcomeEmail, sent } = await load("../../src/emails.ts");
  await sendWelcomeEmail.run({ email: "ada@example.com", name: "Ada" });
  assert.deepEqual(sent, [{ to: "ada@example.com", subject: "Welcome, Ada!" }]);
  await assert.rejects(sendWelcomeEmail.run({ email: "nope", name: "Ada" }));
});

test("no deprecated zod APIs", () => {
  assert.deepEqual(deprecatedZodUses(), []);
});
