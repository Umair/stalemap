import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PackageReport } from "../src/analyze.ts";
import { extractCode, gradeCode } from "../src/probe/grade.ts";
import { openaiCompatibleProvider } from "../src/probe/providers.ts";
import { parseModelSpecs } from "../src/probe/run.ts";
import { buildProbes, probePrompt } from "../src/probe/tasks.ts";

/** A package root laid out like the cache: <root>/node_modules/lib */
async function fakePackageRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "stalemap-probe-root-"));
  const dir = join(root, "node_modules", "lib");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "package.json"), JSON.stringify({ name: "lib", types: "index.d.ts" }));
  await writeFile(
    join(dir, "index.d.ts"),
    `export interface CallOptions { model: string; stopWhen?: number }
export declare function streamText(options: CallOptions): void;
export declare function revalidateTag(tag: string, profile: string): void;
export type ModelMessage = { role: string; content: string };
export declare class Client {
  /** @deprecated Use \`query\` instead. */
  fetchQuery(key: string): Promise<unknown>;
  query(key: string): Promise<unknown>;
}
`,
  );
  return root;
}

test("extractCode joins fenced blocks and ignores prose", () => {
  assert.equal(extractCode("Here:\n```ts\nconst a = 1;\n```\nand\n```tsx\nconst b = 2;\n```"), "const a = 1;\n\n\nconst b = 2;\n");
  assert.equal(extractCode("I can't help with that."), "");
});

test("gradeCode flags removed exports, removed options, new required args and deprecated members", async () => {
  const packageRoot = await fakePackageRoot();
  const stale = [
    { code: `import { type CoreMessage } from "lib";\nconst m: CoreMessage = null as any;`, names: ["CoreMessage"], apiNames: ["CoreMessage"] },
    { code: `import { streamText } from "lib";\nstreamText({ model: "m", maxSteps: 5 });`, names: ["maxSteps"], apiNames: ["streamText"] },
    { code: `import { revalidateTag } from "lib";\nrevalidateTag("posts");`, names: [], callees: ["revalidateTag"], apiNames: ["revalidateTag"] },
    { code: `import { Client } from "lib";\nnew Client().fetchQuery("k");`, names: ["fetchQuery"], apiNames: ["Client"] },
  ];
  for (const s of stale) {
    const g = await gradeCode(s.code, { packageRoot, names: s.names, callees: s.callees, apiNames: s.apiNames });
    assert.equal(g.verdict, "stale", `${s.code}\n${g.findings.join("\n")}`);
    assert.ok(g.touchedApi);
  }
  const current = [
    { code: `import { type ModelMessage } from "lib";\nconst m: ModelMessage = { role: "user", content: "hi" };`, names: ["CoreMessage"], apiNames: ["CoreMessage", "ModelMessage"] },
    { code: `import { streamText } from "lib";\nstreamText({ model: "m", stopWhen: 5 });`, names: ["maxSteps"], apiNames: ["streamText"] },
    { code: `import { revalidateTag } from "lib";\nrevalidateTag("posts", "max");`, names: [], callees: ["revalidateTag"], apiNames: ["revalidateTag"] },
    // An unrelated error (unknown module) must not count against the probed API.
    { code: `import x from "other-lib";\nimport { Client } from "lib";\nnew Client().query(x);`, names: ["fetchQuery"], apiNames: ["Client"] },
  ];
  for (const c of current) {
    const g = await gradeCode(c.code, { packageRoot, names: c.names, callees: c.callees, apiNames: c.apiNames });
    assert.equal(g.verdict, "current", `${c.code}\n${g.findings.join("\n")}`);
  }
  assert.equal((await gradeCode("", { packageRoot, names: ["x"], apiNames: [] })).verdict, "no-code");
  // Compiles but never uses the probed API: inconclusive, not "the model knows it".
  assert.equal((await gradeCode("export const n = 1;", { packageRoot, names: ["maxSteps"], apiNames: ["streamText"] })).verdict, "avoided");
});

const report = (): PackageReport => ({
  name: "ai",
  status: "changed",
  pinned: "7.0.0",
  baseline: { version: "4.3.0", publishedAt: "" },
  major: true,
  used: true,
  usedNames: ["streamText", "CoreMessage"],
  files: [],
  changelog: { source: "package CHANGELOG", versions: ["5.0.0"], items: [{ version: "5.0.0", text: "rename CoreMessage to ModelMessage", raw: "", score: 9 }] },
  types: {
    analyzed: ["."],
    noTypes: false,
    changes: [
      { subpath: ".", symbol: "CoreMessage", kind: "removed", detail: "`CoreMessage` was removed", used: true, severity: 9 },
      { subpath: ".", symbol: "ModelMessage", kind: "added", detail: "`ModelMessage`", used: false, severity: 1 },
      {
        subpath: ".",
        symbol: "streamText",
        kind: "params",
        detail: "`streamText()` options no longer accept `maxSteps`",
        used: true,
        severity: 8,
        meta: { removedOptions: ["experimental_output", "maxSteps"] },
      },
      { subpath: ".", symbol: "useChat", kind: "params", detail: "x", used: true, severity: 8, meta: { removedOptions: ["experimental_throttle"] } },
      { subpath: ".", symbol: "internalThing", kind: "removed", detail: "x", used: false, severity: 9 },
    ],
  },
});

test("buildProbes targets used, testable changes and grades on stable names", () => {
  const probes = buildProbes([report()], 10, false);
  assert.deepEqual(probes.map((p) => p.symbol), ["CoreMessage", "streamText"], "unused and experimental-only changes are skipped");
  assert.deepEqual(probes[0].target.apiNames, ["CoreMessage", "ModelMessage"], "replacement inferred from the changelog rename");
  assert.deepEqual(probes[1].target.names, ["maxSteps", "experimental_output"]);
  assert.equal(buildProbes([report()], 10, true).length, 3, "--include-unused adds high-severity unused changes");

  const prompt = probePrompt(probes[0], "**ai** notes");
  assert.match(prompt, /^Notes about `ai@7\.0\.0`/);
  assert.match(probePrompt(probes[0]), /Write it for version 7\.0\.0/);
});

test("parseModelSpecs reads optional cutoffs", () => {
  assert.deepEqual(parseModelSpecs("claude-opus-5-5, qwen3:8b=2025-04"), [{ id: "claude-opus-5-5" }, { id: "qwen3:8b", cutoff: "2025-04" }]);
});

test("openaiCompatibleProvider posts a chat completion and returns the message", async () => {
  let seen: { model?: string; messages?: Array<{ role: string }> } = {};
  let auth: string | undefined;
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen = JSON.parse(body);
      auth = req.headers.authorization;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ choices: [{ message: { content: "```ts\nexport {}\n```" } }] }));
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", () => done()));
  const port = (server.address() as { port: number }).port;
  try {
    const provider = openaiCompatibleProvider(`http://127.0.0.1:${port}/v1`, "sk-test");
    assert.equal(await provider.complete("qwen3:8b", "hello"), "```ts\nexport {}\n```");
    assert.equal(seen.model, "qwen3:8b");
    assert.deepEqual(seen.messages?.map((m) => m.role), ["system", "user"]);
    assert.equal(auth, "Bearer sk-test");
  } finally {
    server.close();
  }
});
