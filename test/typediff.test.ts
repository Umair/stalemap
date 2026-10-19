import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { analyzeTypes, cleanDeprecation, diffSurfaces, extractSurface, publicSubpaths, resolveTypesEntry, testSubpaths, type Surface } from "../src/typediff.ts";

async function pkg(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "stalemap-pkg-"));
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(dir, name, ".."), { recursive: true });
    await writeFile(join(dir, name), text);
  }
  return dir;
}

const V1 = `
export interface CallOptions { model: string; maxSteps?: number; temperature?: number }
export declare function streamText(options: CallOptions): void;
export declare function revalidateTag(tag: string): void;
export declare function unstable_cacheLife(profile: string): void;
export declare function legacy(): void;
export declare class Client {
  constructor(opts?: { apiKey?: string; timeout?: number });
  fetchQuery(key: string): Promise<unknown>;
  protected internal(): void;
}
export type Message = { role: string; content: string };
`;

const V2 = `
export interface CallOptions { model: string; temperature?: number; stopWhen?: unknown }
export declare function streamText(options: CallOptions): void;
export declare function revalidateTag(tag: string, profile: string): void;
export declare function cacheLife(profile: string): void;
export declare class Client {
  constructor(opts: { apiKey?: string; baseURL: string });
  /** @deprecated Use \`client.query(options)\` instead. */
  fetchQuery(key: string): Promise<unknown>;
  query(key: string): Promise<unknown>;
}
/** @deprecated Use \`ModelMessage\` instead. */
export type Message = { role: string; content: string };
`;

test("diffSurfaces finds removals, renames, new requirements, option and member changes", async () => {
  const a = await pkg({ "package.json": JSON.stringify({ name: "lib", types: "index.d.ts" }), "index.d.ts": V1 });
  const b = await pkg({ "package.json": JSON.stringify({ name: "lib", types: "index.d.ts" }), "index.d.ts": V2 });
  const before = extractSurface(resolveTypesEntry(a, ".")!);
  const after = extractSurface(resolveTypesEntry(b, ".")!);
  const changes = diffSurfaces(".", before, after, new Set(["streamText", "revalidateTag", "legacy", "Client", "Message"]));
  const find = (re: RegExp) => changes.find((c) => re.test(c.detail));

  assert.ok(find(/`legacy` was removed/)?.used);
  assert.ok(find(/`unstable_cacheLife` was renamed to `cacheLife`/));
  assert.ok(find(/`revalidateTag\(\)` now requires `profile`/));
  assert.ok(find(/`streamText\(\)` options no longer accept `maxSteps`/));
  assert.ok(find(/`new Client\(\)` options no longer accept `timeout`; options now require `baseURL`/));
  assert.ok(find(/On `Client`, deprecated: `fetchQuery` \(use `client\.query\(options\)`\)/));
  assert.ok(find(/`Message` is deprecated: Use `ModelMessage` instead/));
  assert.ok(!changes.some((c) => c.detail.includes("internal")), "protected members are ignored");
});

test("namespace mirrors map z.member usage onto root exports", async () => {
  const files = (body: string) => ({
    "package.json": JSON.stringify({ name: "zz", exports: { ".": { types: "./index.d.ts" } } }),
    "external.d.ts": body,
    "index.d.ts": `export * from "./external.js";\nexport * as z from "./external.js";\n`,
  });
  const names = Array.from({ length: 12 }, (_, i) => `export declare function f${i}(): void;`).join("\n");
  const a = await pkg(files(`${names}\nexport declare function nativeEnum(values: object): void;`));
  const b = await pkg(files(`${names}\n/** @deprecated Use \`z.enum()\` instead. */\nexport declare function nativeEnum(values: object): void;`));
  const before = extractSurface(resolveTypesEntry(a, ".")!);
  const after = extractSurface(resolveTypesEntry(b, ".")!);
  assert.equal(after.z.mirror, true);
  const changes = diffSurfaces(".", before, after, new Set(["z", "z.nativeEnum"]));
  const dep = changes.find((c) => c.symbol === "nativeEnum");
  assert.equal(dep?.kind, "deprecated");
  assert.equal(dep?.used, true);
});

test("resolveTypesEntry follows exports conditions, wildcards and legacy subpaths", async () => {
  const dir = await pkg({
    "package.json": JSON.stringify({
      name: "p",
      exports: { ".": { import: { types: "./dist/index.d.mts" } }, "./react/*": { types: "./dist/react/*.d.ts" } },
    }),
    "dist/index.d.mts": "export declare const a: 1;",
    "dist/react/hooks.d.ts": "export declare const b: 1;",
  });
  assert.ok(resolveTypesEntry(dir, ".")?.endsWith("dist/index.d.mts"));
  assert.ok(resolveTypesEntry(dir, "./react/hooks")?.endsWith("dist/react/hooks.d.ts"));

  const legacy = await pkg({ "package.json": JSON.stringify({ name: "l", types: "index.d.ts" }), "index.d.ts": "", "server.d.ts": "" });
  assert.ok(resolveTypesEntry(legacy, "./server")?.endsWith("server.d.ts"));
});

test("cleanDeprecation drops code samples, links and 'read more' tails", () => {
  assert.equal(
    cleanDeprecation("Use `NextProxy` instead. Middleware has been renamed to Proxy. Read more: [Docs](https://x.dev)"),
    "Use `NextProxy` instead. Middleware has been renamed to Proxy.",
  );
  assert.equal(cleanDeprecation("Merged into `z.enum()`. ```ts z.enum(Colors) ```"), "Merged into `z.enum()`.");
});

test("options typed as a union report properties every member requires", async () => {
  const v1 = `export type ToolOptions = { parameters: object; description?: string };\nexport declare function tool(tool: ToolOptions): void;\n`;
  const v2 = `type Base = { description?: string };\nexport type ToolOptions = (Base & { inputSchema: object; type?: "function" }) | (Base & { inputSchema: object; type: "provider"; id: string });\nexport declare function tool(tool: ToolOptions): void;\n`;
  const a = await pkg({ "package.json": JSON.stringify({ name: "lib", types: "index.d.ts" }), "index.d.ts": v1 });
  const b = await pkg({ "package.json": JSON.stringify({ name: "lib", types: "index.d.ts" }), "index.d.ts": v2 });
  const changes = diffSurfaces(".", extractSurface(resolveTypesEntry(a, ".")!), extractSurface(resolveTypesEntry(b, ".")!), new Set(["tool"]));
  const c = changes.find((x) => x.symbol === "tool" && x.kind === "params");
  assert.deepEqual(c?.meta?.removedOptions, ["parameters"]);
  assert.deepEqual(c?.meta?.requiredOptions, ["inputSchema"], "inputSchema is required in both members; id only in one");
});

test("nested config keys that moved are reported with their successor, other nested churn isn't", async () => {
  const v1 = `export {};
interface ExperimentalConfig { ppr?: boolean; dynamicIO?: boolean; typedRoutes?: boolean; turbo?: object }
export interface Config { images?: object; experimental?: ExperimentalConfig }`;
  const v2 = `export {};
interface ExperimentalConfig {
  /** @deprecated This option has been merged into \`cacheComponents\`. */
  ppr?: boolean;
  /** @deprecated use top-level \`cacheComponents\` instead */
  cacheComponents?: boolean;
  reactDebugChannel?: boolean;
}
export interface Config { images?: object; experimental?: ExperimentalConfig; cacheComponents?: boolean; typedRoutes?: boolean }`;
  const a = await pkg({ "package.json": JSON.stringify({ name: "fw", types: "index.d.ts" }), "index.d.ts": v1 });
  const b = await pkg({ "package.json": JSON.stringify({ name: "fw", types: "index.d.ts" }), "index.d.ts": v2 });
  const changes = diffSurfaces(".", extractSurface(resolveTypesEntry(a, ".")!), extractSurface(resolveTypesEntry(b, ".")!), new Set(["Config"]));
  const moved = changes.find((c) => c.symbol === "Config.experimental");
  assert.ok(moved, JSON.stringify(changes, null, 2));
  assert.equal(moved.kind, "deprecated");
  assert.deepEqual(moved.meta?.movedKeys, {
    "experimental.ppr": "merged into `cacheComponents`",
    "experimental.cacheComponents": "use top-level `cacheComponents`",
    "experimental.typedRoutes": "use top-level `typedRoutes`",
  });
  // (Like Next's, the nested type isn't exported, so only `Config` describes it.)
  // Removed nested flags without a successor (`dynamicIO`, `turbo`) aren't reported, and nested keys
  // don't show up as removed members of `Config` itself.
  assert.ok(!changes.some((c) => /dynamicIO|turbo/.test(c.detail)), JSON.stringify(changes, null, 2));
  assert.ok(!changes.some((c) => c.kind === "members" && c.detail.includes("experimental.")));
});

test("surfaces don't depend on the current directory or on node_modules above the cache", async () => {
  // Declarations that leak in if resolution looks outside the package root: Node's types and a peer dependency.
  const decoyNode = (tag: string) => ({
    "package.json": JSON.stringify({ name: "@types/node", types: "index.d.ts" }),
    "index.d.ts": `declare module "http" { export interface IncomingMessage { ${tag}: string } }\ninterface Request { ${tag}(): void }\n`,
  });
  const root = "home/.cache/stalemap/pkgs/lib@1.0.0";
  const files: Record<string, string> = {
    // Like ~/node_modules above ~/.cache/stalemap.
    "home/node_modules/peer/package.json": JSON.stringify({ name: "peer", types: "index.d.ts" }),
    "home/node_modules/peer/index.d.ts": "export interface PeerOptions { decoyPeer?: string }",
    // A project with its own @types/node to run from, and a folder without one.
    "elsewhere/.keep": "",
    [`${root}/node_modules/lib/package.json`]: JSON.stringify({ name: "lib", types: "index.d.ts", dependencies: { "@lib/core": "^1.0.0" } }),
    [`${root}/node_modules/lib/extra.d.ts`]: "export declare const extra: 1;",
    [`${root}/node_modules/lib/index.d.ts`]: `/// <reference types="node" />
import type { IncomingMessage } from "http";
import type { PeerOptions } from "peer";
import type { CoreOptions } from "@lib/core";
export interface ApiRequest extends IncomingMessage { query: string }
export interface Handler extends Request { params: string }
export declare function create(options: CoreOptions & { name: string }, peer?: PeerOptions): void;
export { extra } from "./Extra.js";
`,
    // A sibling fetched alongside it (registry.ts fetchPackageFiles) still resolves.
    [`${root}/node_modules/@lib/core/package.json`]: JSON.stringify({ name: "@lib/core", types: "index.d.ts" }),
    [`${root}/node_modules/@lib/core/index.d.ts`]: "export interface CoreOptions { retries?: number }",
  };
  for (const [dir, tag] of [["home", "decoyHome"], ["project", "decoyProject"]]) {
    for (const [name, text] of Object.entries(decoyNode(tag))) files[`${dir}/node_modules/@types/node/${name}`] = text;
  }
  const top = await pkg(files);
  const entry = resolveTypesEntry(join(top, root, "node_modules", "lib"), ".")!;
  // In a child process each: TypeScript reads the current directory once per process.
  const script = `import { extractSurface } from ${JSON.stringify(import.meta.resolve("../src/typediff.ts"))};
process.stdout.write(JSON.stringify(extractSurface(process.argv[1])));`;
  const from = (cwd: string): Surface =>
    JSON.parse(execFileSync(process.execPath, ["--import", import.meta.resolve("tsx"), "--input-type=module", "-e", script, entry], { cwd: join(top, cwd), encoding: "utf8" }));

  const a = from("project");
  const b = from("elsewhere");
  assert.deepEqual(a, b);
  assert.doesNotMatch(JSON.stringify(a), /decoy/);
  assert.deepEqual(Object.keys(a.ApiRequest.members!), ["query"]);
  assert.deepEqual(Object.keys(a.Handler.members!), ["params"]);
  assert.deepEqual(Object.keys(a.create.signatures![0][0].props!).sort(), ["name", "retries"]);
  assert.equal(a.create.signatures![0][1].props, undefined, "peer types stay unresolved");
  // File names match exactly, as on a case-sensitive file system: `./Extra.js` isn't extra.d.ts.
  assert.equal(a.extra.kind, "reexport");
  assert.deepEqual(extractSurface(entry, join(top, root)), a);
});

test("--all diffs the test entry points nothing imports yet, default discovery skips them", async () => {
  const exportsMap = { ".": { types: "./index.d.ts" }, "./test": { types: "./test.d.ts" }, "./internal": { types: "./internal.d.ts" } };
  const before = await pkg({ "package.json": JSON.stringify({ name: "lib", version: "1.0.0", exports: exportsMap }), "index.d.ts": "export declare const a: number;\n", "test.d.ts": "export declare class MockModelV1 {}\n", "internal.d.ts": "export {};\n" });
  const after = await pkg({ "package.json": JSON.stringify({ name: "lib", version: "2.0.0", exports: exportsMap }), "index.d.ts": "export declare const a: number;\n", "test.d.ts": "export declare class MockModelV4 {}\n", "internal.d.ts": "export {};\n" });
  assert.deepEqual(publicSubpaths(after), ["."]);
  assert.deepEqual(testSubpaths(after), ["./test"]);
  const plain = await analyzeTypes("lib", before, "1.0.0", after, "2.0.0", undefined);
  assert.deepEqual(plain.analyzed, ["."]);
  const all = await analyzeTypes("lib", before, "1.0.0", after, "2.0.0", undefined, true);
  assert.deepEqual(all.analyzed, [".", "./test"]);
  assert.ok(all.changes.some((c) => (c.kind === "removed" || c.kind === "renamed") && c.symbol === "MockModelV1" && c.subpath === "./test"), JSON.stringify(all.changes));
  // With --all, an imported package gets its other entry points diffed too.
  const imported = await analyzeTypes("lib", before, "1.0.0", after, "2.0.0", new Map([[".", new Set(["a"])]]), true);
  assert.deepEqual(imported.analyzed, [".", "./test"]);
});

test("a nested key removed after a deprecation that named its successor moved to it", async () => {
  const v1 = `export {};
interface ExperimentalConfig {
  /** @deprecated Use \`config.turbopack\` instead. */
  turbo?: object;
  dynamicIO?: boolean;
}
export interface Config { experimental?: ExperimentalConfig; turbopack?: object }`;
  const v2 = `export {};
interface ExperimentalConfig { other?: boolean }
export interface Config { experimental?: ExperimentalConfig; turbopack?: object }`;
  const a = await pkg({ "package.json": JSON.stringify({ name: "fw", types: "index.d.ts" }), "index.d.ts": v1 });
  const b = await pkg({ "package.json": JSON.stringify({ name: "fw", types: "index.d.ts" }), "index.d.ts": v2 });
  const changes = diffSurfaces(".", extractSurface(resolveTypesEntry(a, ".")!), extractSurface(resolveTypesEntry(b, ".")!), new Set(["Config"]));
  assert.deepEqual(changes.find((c) => c.symbol === "Config.experimental")?.meta?.movedKeys, { "experimental.turbo": "use top-level `turbopack`" }, JSON.stringify(changes, null, 2));
});

test("an export that left the imported entry point for another one is reported as moved, and diffed there", async () => {
  const exportsMap = { ".": { types: "./index.d.ts" }, "./unstable/api": { types: "./api.d.ts" } };
  const before = await pkg({
    "package.json": JSON.stringify({ name: "tsc-like", version: "5.0.0", types: "index.d.ts" }),
    "index.d.ts": "export interface CompilerOptions { strict?: boolean; baseUrl?: string; outFile?: string }\nexport declare function tokenToString(t: number): string;\n",
  });
  const after = await pkg({
    "package.json": JSON.stringify({ name: "tsc-like", version: "7.0.0", exports: exportsMap }),
    "index.d.ts": "export declare const version: string;\n",
    "api.d.ts": "export interface CompilerOptions { strict?: boolean; rootDir?: string }\n",
  });
  const usage = new Map([[".", new Set(["CompilerOptions", "CompilerOptions.baseUrl"])]]);
  const { changes } = await analyzeTypes("tsc-like", before, "5.0.0", after, "7.0.0", usage);
  const moved = changes.find((c) => c.symbol === "CompilerOptions" && c.kind === "removed");
  assert.equal(moved?.detail, "`CompilerOptions` moved to `tsc-like/unstable/api`", JSON.stringify(changes, null, 2));
  const members = changes.find((c) => c.symbol === "CompilerOptions" && c.kind === "members");
  assert.deepEqual(members?.meta?.members, ["baseUrl", "outFile"]);
  assert.ok(members?.used);
  // Exports that are gone everywhere stay removed.
  assert.ok(changes.some((c) => c.symbol === "tokenToString" && c.kind === "removed" && c.detail === "`tokenToString` was removed"));
});
