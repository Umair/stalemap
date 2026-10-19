import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { analyzeDependency, type AnalyzeOptions } from "../src/analyze.ts";
import { changelogFromSections } from "../src/changelog.ts";
import { runStalemap } from "../src/index.ts";
import {
  entryKey,
  formatDir,
  packSides,
  precomputedEnabled,
  projectEntry,
  SHARD_FORMAT,
  shardFile,
  shardSha,
  trimSides,
  type PackedItem,
  type Shard,
  type ShardIndex,
} from "../src/precomputed.ts";
import type { ProjectDep } from "../src/project.ts";
import { diffSides, SURFACE_FORMAT, type Surface, type SubpathSides } from "../src/typediff.ts";

const long = (field: string) => `type Config = { ${Array.from({ length: 20 }, (_, i) => `k${i}: string;`).join(" ")} ${field} }`;

const BEFORE: Surface = {
  same: { kind: "function", text: "function same(): void", signatures: [[]] },
  fetchQuery: { kind: "function", text: "function fetchQuery(key: string): Promise<unknown>", signatures: [[{ name: "key", optional: false, type: "string" }]] },
  Client: {
    kind: "class",
    text: "class Client",
    members: {
      query: { text: "query(key: string): Promise<unknown>", optional: false },
      close: { text: "close(): void", optional: false },
      timeout: { text: "timeout?: number", optional: true },
    },
  },
  Config: { kind: "type", text: long("old: number;") },
  oldName: { kind: "function", text: "function oldName(x: number): number", signatures: [[{ name: "x", optional: false, type: "number" }]] },
  z: { kind: "namespace", text: "mirror", mirror: true },
  default: { kind: "class", text: "class Api", declName: "Api", members: { send: { text: "send(): void", optional: false } } },
};

const AFTER: Surface = {
  same: BEFORE.same,
  fetchQuery: { ...BEFORE.fetchQuery, deprecated: "Use `query` instead." },
  Client: {
    kind: "class",
    text: "class Client",
    members: {
      query: { text: "query(key: string): Promise<unknown>", optional: false },
      close: { text: "close(): void", optional: false, deprecated: "Use `dispose()` instead." },
      timeout: { text: "timeout: number", optional: false },
      dispose: { text: "dispose(): void", optional: false },
    },
  },
  Config: { kind: "type", text: long("renamed: number;") },
  newName: { kind: "function", text: "function newName(x: number): number", signatures: [[{ name: "x", optional: false, type: "number" }]] },
  z: BEFORE.z,
  default: {
    kind: "class",
    text: "class Api",
    declName: "Api",
    members: { send: { text: "send(): void", optional: false, deprecated: "Use `post()` instead." }, post: { text: "post(): void", optional: false } },
  },
  added: { kind: "function", text: "function added(): void" },
};

const SIDES: SubpathSides = { base: true, next: true, surfaces: [BEFORE, AFTER] };
const NAME = "@acme/lib";
const SECTIONS = [
  { version: "2.0.0", body: "### Breaking changes\n\n- `fetchQuery` is deprecated: use `query` instead.\n- `Client.timeout` is now required.\n- Faster startup." },
  { version: "1.5.0", body: "- Added `added()`, which returns nothing useful at all." },
];

function makeShard(over: Partial<Shard> = {}): Shard {
  const items: PackedItem[] = [];
  const types = { ".": packSides(trimSides(SIDES), items, new Map()), "./server": { base: false, next: true } };
  return {
    format: SHARD_FORMAT,
    stalemap: "test",
    surfaceFormat: SURFACE_FORMAT,
    name: NAME,
    latest: "2.0.0",
    asOf: "2025-09-01T00:00:00.000Z",
    times: { "1.0.0": "2025-01-10T00:00:00.000Z", "1.5.0": "2025-07-01T00:00:00.000Z", "2.0.0": "2025-09-01T00:00:00.000Z" },
    items,
    changelogs: { "package CHANGELOG": SECTIONS },
    entries: { [entryKey("1.0.0", "2.0.0")]: { types, defaultSubpaths: 1, changelog: { source: "package CHANGELOG", sections: [0, 1] } } },
    ...over,
  };
}

test("trimmed shard surfaces replay to the same type changes as the full ones", () => {
  const shard = makeShard();
  const entry = shard.entries[entryKey("1.0.0", "2.0.0")];
  const trimmed = trimSides(SIDES).surfaces!;
  assert.ok(!("same" in trimmed[0]) && !("same" in trimmed[1]), "identical exports are dropped");
  assert.ok(!("query" in trimmed[1].Client.members!), "identical members are dropped");
  assert.ok("z" in trimmed[1], "mirror namespaces stay");

  const usages: Array<Map<string, Set<string>> | undefined> = [
    undefined,
    new Map([[".", new Set<string>()]]),
    new Map([[".", new Set(["fetchQuery", "Client", "Client.close", "z.oldName", "default", "default.send"])]]),
    new Map([[".", new Set(["*"])]]),
    new Map([[".", new Set(["Config"])], ["./server", new Set(["x"])]]),
  ];
  for (const usage of usages) {
    const replay = projectEntry(shard, entry, "1.0.0", usage, [])!;
    const live = diffSides(NAME, "1.0.0", [...(usage ?? new Map([[".", undefined]])).keys()].map((s) => [s, s === "." ? SIDES : { base: false, next: true }]), usage);
    assert.deepEqual(replay.types, live, `usage ${JSON.stringify([...(usage ?? [])].map(([k, v]) => [k, [...v]]))}`);
  }
  const kinds = projectEntry(shard, entry, "1.0.0", undefined, [])!.types.changes.map((c) => `${c.kind}:${c.symbol}`);
  for (const k of ["renamed:oldName", "deprecated:fetchQuery", "members:Client", "signature:Config", "added:added"]) assert.ok(kinds.includes(k), k);

  // An entry point the shard didn't examine means: analyze live.
  assert.equal(projectEntry(shard, entry, "1.0.0", new Map([["./client", new Set(["x"])]]), []), undefined);
});

test("with --all, a shard replays its test entry points too, the way live analysis visits them", () => {
  const shard = makeShard();
  const entry = { ...shard.entries[entryKey("1.0.0", "2.0.0")], testSubpaths: 1 };
  const order = (usage?: Map<string, Set<string>>, all = false) => projectEntry(shard, entry, "1.0.0", usage, [], all)!.types.changes.map((c) => c.subpath);
  assert.ok(!order().includes("./server"), "without --all, only the default entry points");
  assert.ok(order(undefined, true).includes("./server"), "--all adds the test entry point at the end of `types`");
  assert.ok(order(new Map([[".", new Set(["Client"])]]), true).includes("./server"), "and keeps it for an imported package");
});

async function serve(files: Record<string, string>) {
  const hits: string[] = [];
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url!, "http://localhost").pathname);
    hits.push(path);
    const body = files[path];
    res.statusCode = body === undefined ? 404 : 200;
    res.setHeader("content-type", "application/json");
    res.end(body ?? "{}");
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    url,
    registryHits: () => hits.filter((h) => h.startsWith("/registry/")).length,
    shardHits: () => hits.filter((h) => h.endsWith(shardFile(NAME))).length,
    totalHits: () => hits.length,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((done) => server.close(() => done()));
    },
  };
}

function index(shard: Shard, over: Partial<ShardIndex> = {}, sha = shardSha(JSON.stringify(shard))): string {
  return JSON.stringify({ format: SHARD_FORMAT, stalemap: "test", surfaceFormat: SURFACE_FORMAT, packages: { [NAME]: { latest: shard.latest, sha, checked: "2025-10-15T00:00:00.000Z" } }, ...over });
}

let run = 0;
/** A fresh cache, a server with the given shard files, and env pointing stalemap at both. */
async function setup(shardFiles: (prefix: string) => Record<string, string>) {
  const prefix = `/run${++run}/`;
  const srv = await serve(shardFiles(prefix));
  const saved = { ...process.env };
  process.env.STALEMAP_CACHE = await mkdtemp(join(tmpdir(), "stalemap-cache-"));
  process.env.STALEMAP_REGISTRY = `${srv.url}/registry/`;
  process.env.STALEMAP_PRECOMPUTED_URL = `${srv.url}${prefix}`;
  delete process.env.STALEMAP_NO_PRECOMPUTED;
  return {
    ...srv,
    async done() {
      await srv.close();
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
      Object.assign(process.env, saved);
    },
  };
}

/** Shard files as a host serves them: under the format's folder. */
const files = (shard: Shard, idx = index(shard)) => (prefix: string) => ({
  [`${prefix}${formatDir}/index.json`]: idx,
  [`${prefix}${formatDir}/${shardFile(NAME)}`]: JSON.stringify(shard),
});

const dep = (names: string[], range = "2.0.0"): ProjectDep => ({
  name: NAME,
  range,
  kind: "dependencies",
  usage: { subpaths: new Map([[".", new Set(names)]]), files: new Set(["src/a.ts"]) },
});

const options = (cutoff: string): AnalyzeOptions => ({
  model: { id: "test-model", cutoff: new Date(cutoff), cutoffSource: "test", modelSource: "test" },
  marginDays: 30,
  useCache: true,
  llm: false,
  llmModel: "",
  maxNotesPerPackage: 8,
  concurrency: 1,
  precomputed: true,
});

test("a matching shard answers without the registry", async () => {
  const shard = makeShard();
  const env = await setup(files(shard));
  try {
    const r = await analyzeDependency(dep(["fetchQuery", "Client"]), options("2025-06-30"));
    assert.equal(r.status, "changed");
    assert.equal(r.precomputed, true);
    assert.equal(r.baseline?.version, "1.0.0");
    assert.equal(r.baseline?.publishedAt, shard.times["1.0.0"]);
    assert.equal(r.pinnedSource, "package.json range");
    assert.equal(r.major, true);
    // Same as diffing the full surfaces and scoring the changelog for this project.
    const usage = dep(["fetchQuery", "Client"]).usage!.subpaths;
    assert.deepEqual(r.types, diffSides(NAME, "1.0.0", [[".", SIDES]], usage));
    assert.deepEqual(r.changelog, changelogFromSections({ source: "package CHANGELOG", sections: SECTIONS }, new Set(["fetchQuery", "Client"])));
    assert.ok(r.types!.changes.find((c) => c.symbol === "fetchQuery")!.used);

    // The release-time table also answers "known" and "new" for other versions and models.
    assert.equal((await analyzeDependency(dep([]), options("2025-11-14"))).status, "known");
    assert.equal((await analyzeDependency(dep([]), options("2024-06-30"))).status, "new");
    assert.equal(env.registryHits(), 0);
    // Past the time the registry was read, a release the shard doesn't list could be the baseline.
    assert.equal((await analyzeDependency(dep([]), options("2025-12-31"))).precomputed, undefined);
  } finally {
    await env.done();
  }
});

test("no matching entry, a newer pin or an unknown entry point falls back to live analysis", async () => {
  const env = await setup(files(makeShard()));
  try {
    const before = env.registryHits();
    const wrongBaseline = await analyzeDependency(dep([]), options("2025-08-31")); // baseline 1.5.0: not precomputed
    assert.equal(wrongBaseline.precomputed, undefined);
    assert.equal(wrongBaseline.status, "error"); // the test registry has nothing
    const range = await analyzeDependency(dep([], "^2.0.0"), options("2025-06-30")); // a range needs the registry
    assert.equal(range.precomputed, undefined);
    const other = await analyzeDependency({ ...dep([]), usage: { subpaths: new Map([["./client", new Set(["x"])]]), files: new Set() } }, options("2025-06-30"));
    assert.equal(other.precomputed, undefined);
    assert.equal(env.registryHits() - before, 3);
  } finally {
    await env.done();
  }
});

test("shards built with another surface format are ignored", async () => {
  for (const [label, shard, idx] of [
    ["index", makeShard(), index(makeShard(), { surfaceFormat: SURFACE_FORMAT - 1 })],
    ["shard", makeShard({ surfaceFormat: SURFACE_FORMAT - 1 }), undefined],
    ["shard layout", makeShard({ format: SHARD_FORMAT + 1 }), undefined],
  ] as const) {
    const env = await setup(files(shard, idx ?? index(shard)));
    try {
      const r = await analyzeDependency(dep(["fetchQuery"]), options("2025-06-30"));
      assert.equal(r.precomputed, undefined, label);
      assert.equal(env.registryHits(), 1, label);
    } finally {
      await env.done();
    }
  }
});

test("without STALEMAP_PRECOMPUTED_URL nothing is fetched", async () => {
  const env = await setup(files(makeShard()));
  try {
    delete process.env.STALEMAP_PRECOMPUTED_URL;
    const r = await analyzeDependency(dep(["fetchQuery"]), options("2025-06-30"));
    assert.equal(r.precomputed, undefined);
    assert.equal(env.totalHits(), 1); // the registry only
  } finally {
    await env.done();
  }
});

test("a shard that doesn't match the index's hash is ignored, then not refetched for a while", async () => {
  const shard = makeShard();
  const env = await setup(files(shard, index(shard, {}, "an older shard")));
  try {
    const first = await analyzeDependency(dep(["fetchQuery"]), options("2025-06-30"));
    assert.equal(first.precomputed, undefined);
    assert.equal(env.shardHits(), 1);
    const second = await analyzeDependency(dep(["fetchQuery"]), options("2025-06-30"));
    assert.equal(second.precomputed, undefined);
    assert.equal(env.shardHits(), 1);
    assert.equal(env.registryHits(), 2);
  } finally {
    await env.done();
  }
});

test("an unreachable shard server falls back to live analysis", async () => {
  const env = await setup(files(makeShard()));
  try {
    process.env.STALEMAP_PRECOMPUTED_URL = "http://127.0.0.1:9/"; // nothing listens on the discard port
    const r = await analyzeDependency(dep(["fetchQuery"]), options("2025-06-30"));
    assert.equal(r.precomputed, undefined);
    assert.equal(env.registryHits(), 1);
  } finally {
    await env.done();
  }
});

async function project(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "stalemap-project-"));
  await writeFile(join(dir, "package.json"), JSON.stringify({ dependencies: { [NAME]: "2.0.0" } }));
  await mkdir(join(dir, "src"));
  await writeFile(join(dir, "src", "a.ts"), `import { fetchQuery } from "${NAME}";\nfetchQuery("x");\n`);
  return dir;
}

test("STALEMAP_NO_PRECOMPUTED and precomputed: false turn shards off", async () => {
  const env = await setup(files(makeShard()));
  try {
    const cwd = await project();
    const on = await runStalemap({ cwd, cutoff: "2025-06-30" });
    assert.equal(on.reports[0].precomputed, true);
    assert.equal(env.registryHits(), 0);

    const off = await runStalemap({ cwd, cutoff: "2025-06-30", precomputed: false });
    assert.equal(off.reports[0].precomputed, undefined);
    assert.equal(env.registryHits(), 1);

    process.env.STALEMAP_NO_PRECOMPUTED = "1";
    assert.equal(precomputedEnabled(), false);
    const envOff = await runStalemap({ cwd, cutoff: "2025-06-30" });
    assert.equal(envOff.reports[0].precomputed, undefined);
    assert.equal(env.registryHits(), 2);
  } finally {
    await env.done();
  }
});

test("stalemap scan --no-precomputed analyzes live", async () => {
  const env = await setup(files(makeShard()));
  try {
    const cwd = await project();
    const scan = async (...flags: string[]) => {
      const { stdout } = await promisify(execFile)(process.execPath, ["--import", "tsx", "src/cli.ts", "scan", "--json", "--cutoff", "2025-06-30", "--cwd", cwd, ...flags], {
        cwd: resolve(import.meta.dirname, ".."),
        env: process.env,
      });
      return JSON.parse(stdout).reports[0];
    };
    assert.equal((await scan()).precomputed, true);
    assert.equal(env.registryHits(), 0);
    assert.equal((await scan("--no-precomputed")).precomputed, undefined);
    assert.equal(env.registryHits(), 1);
  } finally {
    await env.done();
  }
});
