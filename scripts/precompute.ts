/**
 * Precompute reports for fast-moving packages, so `stalemap scan` doesn't download them:
 *
 *   npm run precompute -- [--packages next,ai] [--limit 10] [--out data/precomputed]
 *
 * For each package in data/precompute.json and each distinct baseline its models imply, this
 * runs the live analysis (analyzeDependency: tarballs, type surfaces, changelog; no LLM) from
 * that baseline to the latest stable release and stores the project-independent part of it in
 * <out>/<format>/<package>.json, plus <out>/<format>/index.json (format: `formatDir`, e.g. v1.11).
 * Every entry is replayed and compared with the live report before it is written. Release notes
 * that can't be fetched (a GitHub rate limit, say) fail the package instead of shipping without
 * them. src/precomputed.ts explains how scans use the shards.
 *
 * Extracted surfaces are cached per version of the extraction code (src/typediff.ts and the
 * TypeScript compiler), since SURFACE_FORMAT isn't bumped for every edit while it's being
 * worked on, and release notes in a cache only builds write to (a scan may have cached a failed
 * fetch). Downloads are shared with the normal cache. Set STALEMAP_CACHE to use one folder.
 */
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import semver from "semver";
import ts from "typescript";
import { analyzeDependency, type AnalyzeOptions } from "../src/analyze.ts";
import { changelogSections, type Section } from "../src/changelog.ts";
import { parseKnowledge, type ResolvedModel } from "../src/models.ts";
import {
  entryKey,
  formatDir,
  projectEntry,
  SHARD_FORMAT,
  shardFile,
  shardSha,
  packSides,
  trimSides,
  type PackedSides,
  type Shard,
  type ShardEntry,
  type ShardIndex,
} from "../src/precomputed.ts";
import type { ProjectDep } from "../src/project.ts";
import { chooseBaseline, fetchPackageFiles, getPackument, isStable, type Packument } from "../src/registry.ts";
import { publicSubpaths, subpathSides, SURFACE_FORMAT, testSubpaths } from "../src/typediff.ts";
import { TOOL_VERSION, cacheDir, mapLimit, setLogLevel, sha256 } from "../src/util.ts";

interface Config {
  margin: number;
  models: Array<{ id: string; knowledge: string }>;
  /** Group name → package names. */
  packages: Record<string, string[]>;
}

const root = resolve(import.meta.dirname, "..");
const { values } = parseArgs({
  options: {
    config: { type: "string" },
    out: { type: "string" },
    packages: { type: "string" },
    limit: { type: "string" },
    /** Entry points examined per package; projects importing others fall back to live analysis. */
    subpaths: { type: "string", default: "32" },
    concurrency: { type: "string", default: "2" },
    verbose: { type: "boolean", short: "v" },
  },
});
setLogLevel({ verbose: values.verbose });

const config = JSON.parse(await readFile(values.config ?? join(root, "data", "precompute.json"), "utf8")) as Config;
let names = values.packages ? values.packages.split(",").map((s) => s.trim()).filter(Boolean) : Object.values(config.packages).flat();
if (values.limit) names = names.slice(0, Number(values.limit));
const models: ResolvedModel[] = config.models.map((m) => ({
  id: m.id,
  cutoff: parseKnowledge(m.knowledge),
  cutoffSource: `knowledge ${m.knowledge}`,
  modelSource: "data/precompute.json",
}));
const maxSubpaths = Number(values.subpaths);
const outDir = join(resolve(values.out ?? join(root, "data", "precomputed")), formatDir);
await mkdir(outDir, { recursive: true });

if (!process.env.STALEMAP_CACHE) {
  const shared = cacheDir();
  const extraction = sha256(`${ts.version}\0${await readFile(join(root, "src", "typediff.ts"), "utf8")}`).slice(0, 12);
  const own = join(shared, "precompute", extraction);
  await mkdir(own, { recursive: true });
  const links: Array<[string, string]> = [
    ["pkgs", join(shared, "pkgs")],
    ["packuments", join(shared, "packuments")],
    ["changelogs", join(shared, "precompute", "changelogs")],
  ];
  for (const [dir, target] of links) {
    await mkdir(target, { recursive: true });
    await symlink(target, join(own, dir), "dir").catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "EEXIST") throw err;
    });
  }
  process.env.STALEMAP_CACHE = own;
}

/** dist-tags.latest, unless it is a prerelease (prisma tags release candidates `latest`). */
function latestStable(p: Packument): string | undefined {
  const tag = p.distTags.latest;
  if (tag && isStable(tag) && p.versions[tag]) return tag;
  return Object.keys(p.versions).filter(isStable).sort(semver.rcompare)[0];
}

async function buildShard(name: string): Promise<{ shard: Shard; checked: string } | undefined> {
  const p = await getPackument(name, true);
  const latest = latestStable(p);
  if (!latest) return undefined;
  const nextDir = await fetchPackageFiles(p, latest);
  // Test helpers go last, so `--all` scans (which add them) replay from the same entry.
  const tests = testSubpaths(nextDir);
  const subpaths = [...publicSubpaths(nextDir, maxSubpaths), ...tests];
  const defaults = publicSubpaths(nextDir);
  if (defaults.some((s, i) => subpaths[i] !== s)) throw new Error("the default entry points aren't a prefix of the examined ones");

  const stable = Object.keys(p.time).filter(isStable).sort(semver.compare);
  const shard: Shard = {
    format: SHARD_FORMAT,
    stalemap: TOOL_VERSION,
    surfaceFormat: SURFACE_FORMAT,
    name,
    latest,
    asOf: Object.values(p.time).sort().at(-1)!,
    times: Object.fromEntries(stable.map((v) => [v, p.time[v]])),
    items: [],
    changelogs: {},
    entries: {},
  };

  // One entry per distinct baseline; models with the same baseline share it.
  const baselines = new Map<string, ResolvedModel>();
  for (const m of models) {
    const b = chooseBaseline(p, m.cutoff, config.margin);
    if (b && semver.lt(b.version, latest) && !baselines.has(b.version)) baselines.set(b.version, m);
  }
  const ids = { sections: new Map<string, number>(), items: new Map<string, number>() };
  for (const [baseline, model] of [...baselines].sort((a, b) => semver.compare(a[0], b[0]))) {
    const key = entryKey(baseline, latest);
    try {
      const entry = await buildEntry(shard, p, baseline, model, nextDir, subpaths, defaults.length, tests.length, ids);
      shard.entries[key] = entry;
      const changed = Object.values(entry.types).filter((s) => s.surfaces && Object.keys(s.surfaces[1]).length).length;
      log(`  ${name} ${key}: ${changed}/${subpaths.length} entry points differ, ${entry.changelog?.sections.length ?? 0} changelog sections`);
    } catch (err) {
      if (err instanceof ReleaseNotesError) throw err;
      log(`  ${name} ${key}: skipped (${(err as Error).message})`);
    }
  }
  dropUnused(shard);
  return { shard, checked: new Date(p.fetchedAt).toISOString() };
}

/** A skipped entry may have added items and sections no other entry uses. */
function dropUnused(shard: Shard): void {
  const usedItems = new Set<number>();
  for (const e of Object.values(shard.entries)) for (const s of Object.values(e.types)) for (const side of s.surfaces ?? []) for (const id of Object.values(side)) usedItems.add(id);
  const keep = [...usedItems].sort((a, b) => a - b);
  const newId = new Map(keep.map((old, i) => [old, i]));
  shard.items = keep.map((i) => shard.items[i]);
  for (const e of Object.values(shard.entries)) {
    for (const s of Object.values(e.types)) {
      if (s.surfaces) s.surfaces = s.surfaces.map((side) => Object.fromEntries(Object.entries(side).map(([k, id]) => [k, newId.get(id)!]))) as PackedSides["surfaces"];
    }
  }
  for (const source of Object.keys(shard.changelogs) as Array<keyof Shard["changelogs"]>) {
    const users = Object.values(shard.entries).filter((e) => e.changelog?.source === source);
    const used = [...new Set(users.flatMap((e) => e.changelog!.sections))].sort((a, b) => a - b);
    const renumber = new Map(used.map((old, i) => [old, i]));
    shard.changelogs[source] = used.map((i) => shard.changelogs[source]![i]);
    for (const e of users) e.changelog!.sections = e.changelog!.sections.map((i) => renumber.get(i)!);
    if (!used.length) delete shard.changelogs[source];
  }
}

async function buildEntry(
  shard: Shard,
  p: Packument,
  baseline: string,
  model: ResolvedModel,
  nextDir: string,
  subpaths: string[],
  defaultSubpaths: number,
  tests: number,
  ids: { sections: Map<string, number>; items: Map<string, number> },
): Promise<ShardEntry> {
  const { name, latest } = shard;
  // "Imports" every examined entry point but no names: nothing is marked used, so scans can mark their own.
  const imported: ProjectDep = {
    name,
    range: latest,
    kind: "dependencies",
    pinned: latest,
    usage: { subpaths: new Map(subpaths.map((s) => [s, new Set<string>()])), files: new Set() },
  };
  // First, and strictly: a failed fetch throws here instead of being cached as "no release notes",
  // and the live analysis below reads the same cached notes.
  const cl = await changelogSections({ p, pkgDir: nextDir, from: baseline, to: latest, useCache: true, strict: true }).catch((err: Error) => {
    throw new ReleaseNotesError(`release notes for ${baseline}→${latest}: ${err.message}`);
  });
  // Moved exports need surfaces a shard doesn't keep: left out here, so the entry replays exactly.
  const opts: AnalyzeOptions = { model, marginDays: config.margin, useCache: true, llm: false, llmModel: "", maxNotesPerPackage: 8, concurrency: 1, movedExports: false };
  const live = await analyzeDependency(imported, opts);
  if (live.status !== "changed") throw new Error(`live analysis: ${live.status}${live.error ? ` (${live.error})` : ""}`);
  if (live.baseline?.version !== baseline) throw new Error(`live analysis chose baseline ${live.baseline?.version}`);

  // Both are cache hits now: the same inputs the live report was built from.
  const baseDir = await fetchPackageFiles(p, baseline);
  const types: Record<string, PackedSides> = {};
  for (const s of subpaths) types[s] = packSides(trimSides(await subpathSides(name, baseDir, baseline, nextDir, latest, s)), shard.items, ids.items);
  const entry: ShardEntry = { types, defaultSubpaths, testSubpaths: tests };
  if (cl.source) entry.changelog = { source: cl.source, sections: cl.sections.map((s) => sectionId(shard, cl.source!, s, ids.sections)) };

  // The entry has to replay to exactly the live report, for importing and non-importing projects,
  // with and without `--all`.
  const unimported: ProjectDep = { ...imported, usage: undefined };
  const all: AnalyzeOptions = { ...opts, allSubpaths: true };
  const cases = [
    [imported, live, false],
    [unimported, await analyzeDependency(unimported, opts), false],
    [unimported, await analyzeDependency(unimported, all), true],
  ] as const;
  for (const [dep, report, allSubpaths] of cases) {
    const replay = projectEntry(shard, entry, baseline, dep.usage?.subpaths, report.usedNames, allSubpaths);
    if (!replay) throw new Error("replay doesn't cover the entry points live analysis examined");
    if (JSON.stringify(replay.types) !== JSON.stringify(report.types)) throw new Error("replayed type changes differ from live analysis");
    if (JSON.stringify(replay.changelog) !== JSON.stringify(report.changelog)) throw new Error("replayed changelog differs from live analysis");
  }
  return entry;
}

class ReleaseNotesError extends Error {}

/** Sections are stored once per shard; entries list the ones they use. */
function sectionId(shard: Shard, source: keyof Shard["changelogs"], s: Section, ids: Map<string, number>): number {
  const key = `${source}\0${s.version}\0${sha256(s.body)}`;
  let id = ids.get(key);
  if (id === undefined) {
    const list = (shard.changelogs[source] ??= []);
    id = list.push(s) - 1;
    ids.set(key, id);
  }
  return id;
}

function log(msg: string): void {
  process.stderr.write(msg + "\n");
}

// Shards built with another format are unreadable for this version: start a new index then.
const indexPath = join(outDir, "index.json");
const previous = await readFile(indexPath, "utf8").then((t) => JSON.parse(t) as ShardIndex, () => undefined);
const sameFormat = previous?.format === SHARD_FORMAT && previous.surfaceFormat === SURFACE_FORMAT;
if (previous && !sameFormat) log(`index.json has format ${previous.format}/${previous.surfaceFormat}; starting a new one (rebuild the other shards too)`);
const packages: ShardIndex["packages"] = sameFormat ? { ...previous!.packages } : {};

const started = Date.now();
let failed = 0;
await mapLimit(names, Number(values.concurrency), async (name) => {
  const t0 = Date.now();
  try {
    const built = await buildShard(name);
    if (!built) {
      log(`${name}: no stable release; skipped`);
      return;
    }
    const { shard, checked } = built;
    const text = JSON.stringify(shard) + "\n";
    await writeFile(join(outDir, shardFile(name)), text);
    packages[name] = { latest: shard.latest, sha: shardSha(text), checked };
    log(`${name}@${shard.latest}: ${Object.keys(shard.entries).length} entries, ${(text.length / 1024).toFixed(0)} KB (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (err) {
    failed++;
    log(`${name}: failed (${(err as Error).message})`);
  }
});

const index: ShardIndex = {
  format: SHARD_FORMAT,
  stalemap: TOOL_VERSION,
  surfaceFormat: SURFACE_FORMAT,
  packages: Object.fromEntries(Object.entries(packages).sort((a, b) => a[0].localeCompare(b[0]))),
};
await writeFile(indexPath, JSON.stringify(index, null, 1) + "\n");
log(`${names.length - failed}/${names.length} packages in ${((Date.now() - started) / 1000).toFixed(0)}s → ${outDir}`);
process.exitCode = failed ? 1 : 0;
