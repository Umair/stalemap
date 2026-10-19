import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PackageReport } from "../src/analyze.ts";
import { guardFile, guardMessage } from "../src/guard.ts";
import type { TypeChange } from "../src/typediff.ts";

async function project(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "stalemap-guard-"));
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(dir, name, ".."), { recursive: true });
    await writeFile(join(dir, name), text);
  }
  return dir;
}

const LIB = `export interface CallOptions { model: string; stopWhen?: number }
export declare function generate(options: CallOptions): Promise<string>;
export declare function revalidate(tag: string, profile: string): void;
/** @deprecated Use \`ModelMessage\` instead. */
export type CoreMessage = { role: string };
export type ModelMessage = { role: string };
`;

test("the guard reports dependency API errors and deprecations, not unrelated code errors", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { lib: "2.0.0" } }),
    "node_modules/lib/package.json": JSON.stringify({ name: "lib", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/lib/index.d.ts": LIB,
    "src/app.ts": `import { generate, revalidate, type CoreMessage } from "lib";
const m: CoreMessage = { role: "user" };
export async function run() {
  await generate({ model: "m", maxSteps: 5 });
  revalidate("posts");
}
const n: number = "not a number"; // the project's own bug: not the guard's business
`,
  });
  const result = await guardFile({ cwd: dir, file: "src/app.ts", offline: true, deprecations: true });
  const problems = result!.findings.map((f) => `${f.line}: ${f.problem}`);
  assert.ok(problems.some((p) => p.startsWith("4: TS2353") && p.includes("maxSteps")), problems.join("\n"));
  assert.ok(problems.some((p) => p.startsWith("5: TS2554")), problems.join("\n"));
  assert.ok(problems.some((p) => p.startsWith("2:") && p.includes("deprecated")), problems.join("\n"));
  assert.ok(!problems.some((p) => p.startsWith("7:")), "errors outside dependency APIs are left alone");
  assert.match(guardMessage(result, dir), /^stalemap: `src\/app\.ts` uses APIs that changed/);
});

test("the guard stays silent on clean files and files without dependency imports", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { lib: "2.0.0" } }),
    "node_modules/lib/package.json": JSON.stringify({ name: "lib", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/lib/index.d.ts": LIB,
    "src/ok.ts": `import { generate, type ModelMessage } from "lib";\nexport const m: ModelMessage = { role: "user" };\nexport const p = generate({ model: "m", stopWhen: 5 });\n`,
    "src/plain.ts": `export const x = 1;\n`,
  });
  assert.equal(guardMessage(await guardFile({ cwd: dir, file: "src/ok.ts", offline: true }), dir), "");
  assert.equal(await guardFile({ cwd: dir, file: "src/plain.ts", offline: true }), undefined);
  assert.equal(await guardFile({ cwd: dir, file: "README.md", offline: true }), undefined);
});

function changed(name: string, changes: TypeChange[], changelog: string[] = []): PackageReport {
  return {
    name,
    status: "changed",
    pinned: "2.0.0",
    baseline: { version: "1.0.0", publishedAt: "" },
    major: true,
    used: true,
    usedNames: [],
    files: [],
    changelog: { source: "package CHANGELOG", versions: ["2.0.0"], items: changelog.map((text) => ({ version: "2.0.0", text, raw: text, score: 1 })) },
    types: { analyzed: ["."], noTypes: false, changes },
  };
}

const params = (symbol: string, removed: string[], added: string[], optionDocs: Record<string, string> = {}): TypeChange => ({
  subpath: ".",
  symbol,
  kind: "params",
  detail: `\`${symbol}()\` options no longer accept ${removed.map((o) => `\`${o}\``).join(", ")}`,
  used: true,
  severity: 8,
  meta: { removedOptions: removed, addedOptions: added, optionDocs },
});

test("an error inside a nested call gets the note for that call, not the outer one", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { lib: "2.0.0", val: "2.0.0" } }),
    "node_modules/lib/package.json": JSON.stringify({ name: "lib", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/lib/index.d.ts": `export interface CallOptions { model: string; stopWhen?: number; tools?: Record<string, unknown> }
export declare function generate(options: CallOptions): Promise<string>;
export interface ToolDef<I> { inputSchema: I; execute?: (input: I) => unknown }
export declare function tool<I>(def: ToolDef<I> & { outputSchema: unknown }): ToolDef<I>;
export declare function tool<I>(def: ToolDef<I>): ToolDef<I>;
`,
    "node_modules/val/package.json": JSON.stringify({ name: "val", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/val/index.d.ts": `export declare function count(options: { atMost: number }): number;\n`,
    "src/agent.ts": `import { generate, tool } from "lib";
import * as v from "val";
export const run = () =>
  generate({
    model: "m",
    maxSteps: 5,
    tools: { weather: tool({ parameters: { city: "" }, execute: async ({ city }) => city }) },
  });
export const capped = () => generate({ model: "m", stopWhen: v.count({ max: 1 }) });
export const wrong = () => generate(tool({ inputSchema: 1 }));
`,
  });
  const reports = [
    changed("lib", [
      // The outer call's note mentions "tool" in passing, as ai's `generateText()` note does.
      params("generate", ["maxSteps"], ["stopWhen"], { stopWhen: "Condition for stopping when there are tool results" }),
      params("tool", ["parameters"], ["inputSchema"]),
    ], ["generate: maxSteps is gone, see stopWhen", "tool: parameters is gone, see inputSchema"]),
    changed("val", [params("count", ["max"], ["atMost"])]),
  ];
  const result = await guardFile({ cwd: dir, file: "src/agent.ts", reports });
  const at = (line: number) => result!.findings.find((f) => f.line === line);
  const all = JSON.stringify(result!.findings, null, 2);

  assert.match(at(6)?.problem ?? "", /^TS2353: .*'maxSteps'/, all);
  assert.match(at(6)?.hint ?? "", /^`generate\(\)` options no longer accept `maxSteps`.*`stopWhen`/, all);
  assert.match(at(7)?.problem ?? "", /^TS2769: No overload matches this call/, all);
  assert.match(at(7)?.hint ?? "", /^`tool\(\)` options no longer accept `parameters`.*`inputSchema`/, all);
  // A nested call from another package: the error and the note are that package's.
  assert.equal(at(9)?.pkg, "val", all);
  assert.match(at(9)?.hint ?? "", /^`count\(\)` options no longer accept `max`/, all);
  // The nested call as a whole is the outer call's argument: that error stays with the outer call.
  assert.match(at(10)?.hint ?? "", /^`generate\(\)`/, all);
});

test("deprecations are only reported when asked for", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { lib: "2.0.0" } }),
    "node_modules/lib/package.json": JSON.stringify({ name: "lib", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/lib/index.d.ts": LIB,
    "src/old.ts": `import type { CoreMessage } from "lib";\nexport const m: CoreMessage = { role: "user" };\n`,
  });
  assert.equal((await guardFile({ cwd: dir, file: "src/old.ts", offline: true }))!.findings.length, 0);
  assert.equal((await guardFile({ cwd: dir, file: "src/old.ts", offline: true, deprecations: true }))!.findings.length, 1);
});

const FW = `export interface ExperimentalConfig {
  /** @deprecated use top-level \`cacheComponents\` instead */
  cacheComponents?: boolean;
  /** @deprecated This option has been merged into \`cacheComponents\`. */
  ppr?: boolean;
  reactDebugChannel?: boolean;
}
export interface FwConfig { experimental?: ExperimentalConfig; cacheComponents?: boolean }
/** @deprecated Use \`FwProxy\` instead. Middleware has been renamed to Proxy. */
export type FwMiddleware = (req: unknown) => unknown;
export type FwProxy = (req: unknown) => unknown;
`;

const fwReport = () =>
  changed(
    "fw",
    [
      {
        subpath: ".",
        symbol: "FwConfig.experimental",
        kind: "deprecated",
        detail: "`FwConfig` config: `experimental.cacheComponents` is deprecated (use top-level `cacheComponents`)",
        used: true,
        severity: 7,
        meta: {
          members: ["experimental.cacheComponents", "experimental.ppr"],
          movedKeys: { "experimental.cacheComponents": "use top-level `cacheComponents`", "experimental.ppr": "merged into `cacheComponents`" },
        },
      },
      { subpath: ".", symbol: "FwMiddleware", kind: "deprecated", detail: "`FwMiddleware` is deprecated: Use `FwProxy` instead. Middleware has been renamed to Proxy.", used: true, severity: 6 },
    ],
    ["rename experimental.dynamicIO to experimental.cacheComponents", "Deprecate `middleware` and recommend `proxy`"],
  );

test("moved config keys are reported even though they type-check", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { fw: "2.0.0" } }),
    "node_modules/fw/package.json": JSON.stringify({ name: "fw", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/fw/index.d.ts": FW,
    "fw.config.ts": `import type { FwConfig } from "fw";
const config: FwConfig = {
  experimental: { cacheComponents: true, ppr: true, reactDebugChannel: true },
};
export default config;
`,
    "good.config.ts": `import type { FwConfig } from "fw";
export default { cacheComponents: true, experimental: { reactDebugChannel: true } } satisfies FwConfig;
`,
  });
  const result = await guardFile({ cwd: dir, file: "fw.config.ts", reports: [fwReport()] });
  const all = JSON.stringify(result!.findings, null, 2);
  assert.equal(result!.findings.length, 2, all);
  assert.match(result!.findings[0].problem, /`experimental\.cacheComponents` still type-checks, but fw 2\.0\.0 moved it: use top-level `cacheComponents`/, all);
  assert.match(result!.findings[1].problem, /`experimental\.ppr` .*merged into `cacheComponents`/, all);
  // The note groups keys by successor and adds earlier names from the changelog.
  assert.match(result!.findings[0].hint ?? "", /`experimental\.\{cacheComponents, dynamicIO, ppr\}` → `cacheComponents`/, all);
  // Shown once even though both findings share it.
  assert.equal(guardMessage(result, dir).match(/Fix:/g)?.length, 1);

  const good = await guardFile({ cwd: dir, file: "good.config.ts", reports: [fwReport()] });
  assert.deepEqual(good!.findings, []);
});

test("renamed file conventions are reported at the project root, with changelog and types agreeing", async () => {
  const middleware = `import type { FwProxy } from "fw";
export function middleware(req: unknown) {
  return req;
}
`;
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { fw: "2.0.0" } }),
    "node_modules/fw/package.json": JSON.stringify({ name: "fw", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/fw/index.d.ts": FW,
    "middleware.ts": middleware,
    "proxy.ts": middleware,
    "src/lib/middleware.ts": middleware,
  });
  const at = async (file: string, reports = [fwReport()]) => (await guardFile({ cwd: dir, file, reports }))!.findings.map((f) => f.problem);

  const [rename] = await at("middleware.ts");
  assert.match(rename ?? "", /fw 2\.0\.0 renamed `middleware` to `proxy` \(changelog: “Deprecate `middleware` and recommend `proxy`”\)\. .*now `proxy\.ts`.*export `proxy` instead of `middleware`.*delete `middleware\.ts`/);
  const proxy = await at("proxy.ts");
  assert.ok(proxy.some((p) => /`middleware\.ts` still exists/.test(p)), proxy.join("\n"));
  assert.ok(proxy.some((p) => /Export `proxy` instead of `middleware`/.test(p)), proxy.join("\n"));
  // Half-migrated: the export was renamed but the file wasn't.
  await writeFile(join(dir, "middleware.ts"), middleware.replace("function middleware", "function proxy"));
  const [half] = await at("middleware.ts");
  assert.match(half ?? "", /it's now `proxy\.ts`: move this code there, and delete `middleware\.ts` \(renaming the export alone isn't enough\)/);
  await writeFile(join(dir, "middleware.ts"), middleware);
  // Not a root-level file: no convention applies.
  assert.deepEqual(await at("src/lib/middleware.ts"), []);
  // The changelog alone isn't enough: without a matching deprecation in the types, nothing is said.
  const noTypes = fwReport();
  noTypes.types!.changes = noTypes.types!.changes.filter((c) => c.symbol !== "FwMiddleware");
  assert.deepEqual(await at("middleware.ts", [noTypes]), []);
});

test("hints come from facts about the failing API, not changelog lines that share a word with the file", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { val: "2.0.0" } }),
    "node_modules/val/package.json": JSON.stringify({ name: "val", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/val/index.d.ts": `export declare class ValError { issues: string[] }
export declare function record(key: unknown, value: unknown): unknown;
export declare function parse(x: unknown): { error: ValError };
export declare function email(): unknown;
`,
    "src/schema.ts": `import { record, parse, email } from "val";
export const s = record(email());
export const errs = parse(1).error.errors;
`,
  });
  const report = changed(
    "val",
    [
      // Not in the notes: the file doesn't import `ValError`.
      { subpath: ".", symbol: "ValError", kind: "members", detail: "`ValError`: removed `errors`", used: false, severity: 6, meta: { members: ["errors"] } },
      { subpath: ".", symbol: "email", kind: "deprecated", detail: "`email` is deprecated: Use `string().email()` instead.", used: true, severity: 6 },
    ],
    ["The email pattern dropped its lookaheads"],
  );
  report.changelog!.items[0].score = 9;
  const result = await guardFile({ cwd: dir, file: "src/schema.ts", reports: [report] });
  const at = (line: number) => result!.findings.find((f) => f.line === line);
  const all = JSON.stringify(result!.findings, null, 2);
  assert.match(at(2)?.problem ?? "", /^TS2554/, all);
  assert.equal(at(2)?.hint, undefined, all);
  assert.match(at(3)?.hint ?? "", /^`ValError`: removed `errors`/, all);
});

test("tsconfig option errors from a newer TypeScript are reported, on tsconfig edits and code edits", async () => {
  const ts = (await import("typescript")).default;
  const tsReport = changed("typescript", [
    { subpath: ".", symbol: "CompilerOptions", kind: "deprecated", detail: "On `CompilerOptions`, deprecated: `baseUrl`", used: true, severity: 4, meta: { members: ["baseUrl"] } },
  ]);
  tsReport.pinned = ts.version;
  const files = (version: string, baseUrl: boolean) => ({
    "package.json": JSON.stringify({ name: "app", devDependencies: { typescript: version } }),
    "node_modules/typescript/package.json": JSON.stringify({ name: "typescript", version }),
    "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true, ...(baseUrl ? { baseUrl: ".", paths: { "@/*": ["src/*"] } } : { paths: { "@/*": ["./src/*"] } }) } }),
    "src/a.ts": "export const a = 1;\n",
  });
  const deprecatedBaseUrl = ts.versionMajorMinor >= "6.0";

  const dir = await project(files(ts.version, true));
  for (const file of ["tsconfig.json", "src/a.ts"]) {
    const result = await guardFile({ cwd: dir, file, reports: [tsReport] });
    const all = JSON.stringify(result?.findings, null, 2);
    if (!deprecatedBaseUrl) continue;
    assert.equal(result!.findings.length, 1, all);
    assert.match(result!.findings[0].problem, /^TS5101: Option 'baseUrl' is deprecated/, all);
    assert.equal(result!.findings[0].line, 0);
    assert.match(result!.findings[0].where ?? "", /^tsconfig\.json/);
    assert.match(result!.findings[0].hint ?? "", /`baseUrl`/);
    assert.match(guardMessage(result, dir), /- tsconfig\.json(:\d+)?: TS5101/);
  }
  // Fixed config: nothing to say.
  const clean = await project(files(ts.version, false));
  assert.deepEqual((await guardFile({ cwd: clean, file: "tsconfig.json", reports: [tsReport] }))!.findings, []);
  // A project on another TypeScript version isn't judged by this one's option rules.
  const older = await project(files("5.8.3", true));
  const r = { ...tsReport, pinned: "5.8.3" };
  assert.deepEqual((await guardFile({ cwd: older, file: "tsconfig.json", reports: [r] }))!.findings, []);
});

test("as any and @ts-ignore on APIs from the change set are flagged, elsewhere they aren't", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { lib: "2.0.0" } }),
    "node_modules/lib/package.json": JSON.stringify({ name: "lib", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/lib/index.d.ts": `export declare class MockModelV4 { constructor(o: { doGenerate: () => Promise<{ content: string[] }> }) }
export declare function helper(x: number): number;
export interface Usage { inputTokens: number }
export declare function run(): { usage: Usage };
`,
    "src/testing.ts": `import { MockModelV4, helper, run } from "lib";
export const fake = (reply: string) =>
  new MockModelV4({
    doGenerate: async () => ({ text: reply, usage: { promptTokens: 1 } }) as any,
  });
// @ts-ignore
export const g = new MockModelV4({ doGenerate: async () => ({ text: "x" }) });
export const fine = helper(1 as any);
const result = { a: 1 } as any;
export const cached = (run().usage as any).cachedInputTokens;
// @ts-expect-error
export const old = run().usage.promptTokens;
`,
  });
  const lib = changed("lib", [
    { subpath: ".", symbol: "MockModelV4", kind: "added", detail: "`MockModelV4`", used: false, severity: 1 },
    { subpath: ".", symbol: "Thing", kind: "members", detail: "`Thing`: removed `result`", used: false, severity: 6, meta: { members: ["result"] } },
  ]);
  const found = await guardFile({ cwd: dir, file: "src/testing.ts", reports: [lib] });
  const problems = found!.findings.map((f) => `${f.line}: ${f.problem}`);
  assert.ok(problems.some((p) => p.startsWith("4: `as any` on code that uses `MockModelV4`")), problems.join("\n"));
  assert.ok(problems.some((p) => p.startsWith("6: `@ts-ignore` on code that uses `MockModelV4`")), problems.join("\n"));
  assert.ok(problems.some((p) => p.startsWith("10: `as any` on code that uses `Usage`")), problems.join("\n"));
  assert.ok(problems.some((p) => p.startsWith("11: `@ts-expect-error` on code that uses `Usage`")), problems.join("\n"));
  assert.ok(!problems.some((p) => p.startsWith("8:") || p.startsWith("9:")), "casts on unchanged APIs and local code (even one named like a changed member) are left alone");
});

test("edits to config files and code get notes on changes that still type-check, ranked and deduplicated", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { next: "16.0.0", "@prisma/client": "7.0.0", zod: "4.3.0" } }),
    "node_modules/next/package.json": JSON.stringify({ name: "next", version: "16.0.0", types: "index.d.ts" }),
    "node_modules/next/index.d.ts": "export interface NextConfig { images?: { minimumCacheTTL?: number; remotePatterns?: unknown[] } }\n",
    "node_modules/zod/package.json": JSON.stringify({ name: "zod", version: "4.3.0", types: "index.d.ts" }),
    "node_modules/zod/index.d.ts": "export declare const z: { object(s: object): { pick(m: object): unknown; refine(f: unknown): { pick(m: object): unknown } } };\n",
    "next.config.ts": `import type { NextConfig } from "next";\nconst config: NextConfig = { images: { remotePatterns: [] } };\nexport default config;\n`,
    "prisma/schema.prisma": `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n`,
    "src/profile.ts": `import { z } from "zod";\nconst A = z.object({}).refine(() => true);\nexport const P = A.pick({ email: true });\n`,
  });
  const withNotes = (name: string, texts: Array<[text: string, score: number, heading?: string]>): PackageReport => ({
    ...changed(name, []),
    changelog: { source: "GitHub releases", versions: ["2.0.0"], items: texts.map(([text, score, heading]) => ({ version: "2.0.0", text, raw: text, score, heading })) },
  });
  const next = withNotes("next", [
    ["BREAKING CHANGE!: bump default `images.minimumCacheTTL` from 1 min to 4 hours", 6],
    ["[breaking]: enable router scroll optimization by default", 9],
  ]);
  const prisma = withNotes("@prisma/client", [
    ["`datasource.url` is now configured in the config file", 2, "Schema changes"],
    ["`datasource.shadowDatabaseUrl` is now configured in the config file", 2, "Schema changes"],
  ]);
  const zod = withNotes("zod", [
    ["`.pick()` disallowed on refined schemas", 6, "⚠️ `.pick()` disallowed on refined schemas"],
    ["Using `.pick()` on refined schemas now throws an error.", 6, "⚠️ `.pick()` disallowed on refined schemas"],
    ["Add `z.foo()`", 1],
  ]);
  const reports = [next, prisma, zod];

  const config = await guardFile({ cwd: dir, file: "next.config.ts", reports });
  assert.deepEqual(config!.notes!.map((n) => n.text), ["BREAKING CHANGE!: bump default `images.minimumCacheTTL` from 1 min to 4 hours (changelog, 2.0.0)"]);
  assert.match(guardMessage(config, dir), /^stalemap: `next\.config\.ts` uses names from changes in the installed versions that still type-check/);

  const schema = await guardFile({ cwd: dir, file: "prisma/schema.prisma", reports });
  assert.deepEqual(schema!.findings, []);
  assert.deepEqual(schema!.notes!.map((n) => n.text), ["`datasource.url` is now configured in the config file (changelog, 2.0.0)"], "one per heading");

  const profile = await guardFile({ cwd: dir, file: "src/profile.ts", reports });
  assert.deepEqual(profile!.notes!.map((n) => n.text), ["Using `.pick()` on refined schemas now throws an error. (changelog, 2.0.0)"]);

  assert.equal(await guardFile({ cwd: dir, file: "README.md", reports }), undefined);
});

test("errors reached through a package's values, entry points that no longer resolve, and nothing by stray words", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { odm: "9.0.0" }, devDependencies: { typescript: "6.0.0" } }),
    "node_modules/odm/package.json": JSON.stringify({ name: "odm", version: "9.0.0", types: "index.d.ts", exports: { ".": { types: "./index.d.ts" } } }),
    "node_modules/odm/index.d.ts": `export interface ValidatorProps { path: string; fullPath: string; value: unknown }
export declare class SchemaType { doValidate(value: unknown, props: ValidatorProps): Promise<void>; }
export type PreHook = (this: unknown, options: { session?: string }) => void;
export declare class Schema { path(name: string): SchemaType; pre(event: string, fn: PreHook): this; }
export declare function model(name: string, schema: Schema): unknown;
`,
    "src/check.ts": `import { Schema, model } from "odm";
import { legacy } from "odm/legacy";
const schema = new Schema();
export const m = model("User", schema);
export async function check(value: unknown) {
  const type = schema.path("age");
  await type.doValidate(value, { value, path: "age" });
  type.validate(value);
}
schema.pre("save", function (next) {
  next();
});
const own: number = "Type mismatch in the project's own code";
`,
  });
  const odm = changed("odm", [
    { subpath: ".", symbol: "ValidatorProps", kind: "members", detail: "`ValidatorProps`: now requires `fullPath`", used: false, severity: 6, meta: { members: [] } },
    { subpath: ".", symbol: "SchemaType", kind: "members", detail: "`SchemaType`: removed `validate`", used: false, severity: 6, meta: { members: ["validate"] } },
    { subpath: "./legacy", symbol: "odm/legacy", kind: "subpath", detail: "`odm/legacy` no longer exists as an entry point", used: true, severity: 9 },
    { subpath: ".", symbol: "Type", kind: "removed", detail: "`Type` was removed", used: false, severity: 9 },
  ]);
  const result = await guardFile({ cwd: dir, file: "src/check.ts", reports: [odm] });
  const all = JSON.stringify(result!.findings, null, 2);
  const at = (line: number) => result!.findings.filter((f) => f.line === line);
  assert.match(at(2)[0]?.problem ?? "", /^TS2307: Cannot find module 'odm\/legacy'/, all);
  assert.match(at(7)[0]?.problem ?? "", /^TS2345: .*'ValidatorProps'/, all);
  assert.match(at(7)[0]?.hint ?? "", /now requires `fullPath`/, all);
  assert.match(at(8)[0]?.problem ?? "", /^TS2551: Property 'validate' does not exist on type 'SchemaType'/, all);
  assert.match(at(8)[0]?.hint ?? "", /removed `validate`/, all);
  assert.match(at(11)[0]?.problem ?? "", /^TS2349: This expression is not callable/, all);
  assert.ok(at(11).every((f) => f.pkg === "odm"), all);
  assert.deepEqual(at(13), [], "a message that says `Type` isn't about the removed export `Type`");
});

test("a Fix note has to name what the diagnostic is about: a key, not a CLI flag that shares its name", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { next: "16.0.0" } }),
    "node_modules/next/package.json": JSON.stringify({ name: "next", version: "16.0.0", types: "index.d.ts" }),
    "node_modules/next/index.d.ts": "export interface ExperimentalConfig { ppr?: boolean }\nexport interface NextConfig { experimental?: ExperimentalConfig; turbopack?: { resolveAlias?: Record<string, string> } }\n",
    "next.config.ts": `import type { NextConfig } from "next";\nconst config: NextConfig = {\n  experimental: { turbo: { resolveAlias: {} } },\n};\nexport const other: NextConfig = { temperature: 1 };\nexport default config;\n`,
  });
  const next: PackageReport = {
    ...changed("next", [
      { subpath: ".", symbol: "NextConfig.experimental", kind: "deprecated", detail: "`NextConfig` config: `experimental.turbo` moved", used: true, severity: 7, meta: { members: ["experimental.turbo"], movedKeys: { "experimental.turbo": "use `turbopack`" } } },
    ]),
    guideNotes: [{ text: "`next build` uses Turbopack by default: drop the `--turbopack` and `--turbo` flags.", kind: "cli", keys: ["--turbo"], quote: "Turbopack by default", source: "upgrading/version-16.mdx" }],
  };
  const result = await guardFile({ cwd: dir, file: "next.config.ts", reports: [next] });
  const all = JSON.stringify(result!.findings, null, 2);
  const turbo = result!.findings.find((f) => /'turbo'/.test(f.problem));
  assert.match(turbo?.hint ?? "", /`experimental\.turbo` → `turbopack`/, all);
  const other = result!.findings.find((f) => /'temperature'/.test(f.problem));
  assert.ok(other, all);
  assert.equal(other!.hint, undefined, "no note names `temperature`: none is shown");
});

test("an edit that sets one experimental flag gets no notes about the other keys that moved", async () => {
  const files = (flag: string) => ({
    "package.json": JSON.stringify({ name: "app", dependencies: { next: "16.0.0" } }),
    "node_modules/next/package.json": JSON.stringify({ name: "next", version: "16.0.0", types: "index.d.ts" }),
    "node_modules/next/index.d.ts": "export interface NextConfig { experimental?: Record<string, unknown>; cacheLife?: object; cacheComponents?: boolean }\n",
    "next.config.ts": `import type { NextConfig } from "next";\nconst config: NextConfig = { experimental: { ${flag}: true } };\nexport default config;\n`,
  });
  const next = changed("next", [
    {
      subpath: ".",
      symbol: "NextConfig.experimental",
      kind: "deprecated",
      detail: "`NextConfig` config: `experimental.ppr` is deprecated (merged into `cacheComponents`); `experimental.cacheLife` is deprecated (use top-level `cacheLife`)",
      used: true,
      severity: 7,
      meta: { members: ["experimental.ppr", "experimental.cacheLife"], movedKeys: { "experimental.ppr": "merged into `cacheComponents`", "experimental.cacheLife": "use top-level `cacheLife`" } },
    },
  ]);
  const other = await guardFile({ cwd: await project(files("scrollRestoration")), file: "next.config.ts", reports: [next] });
  assert.deepEqual(other!.notes, []);
  const own = await guardFile({ cwd: await project(files("ppr")), file: "next.config.ts", reports: [next] });
  assert.ok(own!.findings.some((f) => /`experimental\.ppr` still type-checks/.test(f.problem)), JSON.stringify(own));
});
