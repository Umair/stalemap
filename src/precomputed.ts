import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";
import type { PackageReport } from "./analyze.js";
import { changelogFromSections, type ChangelogResult, type Section } from "./changelog.js";
import type { ResolvedModel } from "./models.js";
import type { ProjectDep } from "./project.js";
import { chooseBaseline, isMajorBump } from "./registry.js";
import { diffSides, SURFACE_FORMAT, type ApiItem, type MemberInfo, type Surface, type SubpathSides, type TypeAnalysis } from "./typediff.js";
import { cacheDir, daysBefore, debug, readJson, sha256, writeFileAtomic, writeJsonAtomic } from "./util.js";

/**
 * Precomputed reports: for popular packages, the expensive half of the analysis (downloading
 * both versions, extracting their API surfaces, finding the release notes) is done ahead of
 * time by `scripts/precompute.ts` and published as one JSON shard per package. A scan fetches
 * the shard and replays the cheap half (the diff and the scoring) against the project's imports,
 * so the result is what live analysis would produce. Only package names leave the machine.
 *
 * Nothing is hosted yet, so shards are used only when STALEMAP_PRECOMPUTED_URL is set. Once CI
 * publishes them, the default will be the published data/precomputed/ folder (for example
 * https://raw.githubusercontent.com/Umair/stalemap/main/data/precomputed/).
 */

/**
 * Everything frozen into a shard at build time, checked on read and part of the path, so a host
 * can serve several formats side by side. Bump it when any of these change:
 * - the shard layout or `trimSides` (what `diffSurfaces` may read from a stored surface);
 * - which entry points are examined and in what order: `publicSubpaths`, its ranking and cap;
 * - `resolveTypesEntry`, the `gone` check in `subpathSides`, or sibling fetching in `fetchPackageFiles`;
 * - finding and splitting release notes: `changelogSections`, `parseChangelogSections`, `versionFromTag`.
 * Surface extraction itself is SURFACE_FORMAT. Diffing and scoring are replayed at scan time,
 * so they don't need a bump. The shard's `stalemap` version is informational.
 */
export const SHARD_FORMAT = 2;
/** The folder for this format under the base URL: `<base>/v1.11/index.json`. */
export const formatDir = `v${SHARD_FORMAT}.${SURFACE_FORMAT}`;
const INDEX_TTL_MS = 12 * 60 * 60 * 1000;
/** After a failed fetch, analyze live for a while instead of retrying on every scan. */
const INDEX_RETRY_MS = 60 * 60 * 1000;
const SHARD_RETRY_MS = 15 * 60 * 1000;
/** Until response headers arrive, then for the body (next's shard is ~1.5 MB uncompressed). */
const CONNECT_TIMEOUT_MS = 5000;
const BODY_TIMEOUT_MS = 60_000;

type ChangelogSource = NonNullable<ChangelogResult["source"]>;

/** An item as stored: a member without a deprecation is just its text hash, prefixed "?" if optional. */
export type PackedItem = Omit<ApiItem, "members"> & { members?: Record<string, string | MemberInfo> };

/** `SubpathSides` with each surface's exports as indices into `Shard.items`. */
export type PackedSides = Omit<SubpathSides, "surfaces"> & { surfaces?: [before: Record<string, number>, after: Record<string, number>] };

export interface ShardEntry {
  /** Entry points in the order live analysis visits them (see `trimSides` for what the surfaces keep). */
  types: Record<string, PackedSides>;
  /** How many of `types` live analysis examines when the project doesn't import the package. */
  defaultSubpaths: number;
  /** The test entry points (`ai/test`) at the end of `types`, which `--all` examines too. */
  testSubpaths?: number;
  /** Where the release notes came from, as indices into `Shard.changelogs[source]`. */
  changelog?: { source: ChangelogSource; sections: number[] };
}

export interface Shard {
  format: number;
  /** stalemap version and surface format the shard was built with. */
  stalemap: string;
  surfaceFormat: number;
  name: string;
  /** The latest stable release at build time, which the entries diff to. */
  latest: string;
  /** Publish time of the newest release at build time. */
  asOf: string;
  /** Stable version → publish time, to pick a model's baseline without the registry. */
  times: Record<string, string>;
  /** API items shared by the entries' surfaces. */
  items: PackedItem[];
  /** Release-note sections per source, shared by the entries. */
  changelogs: Partial<Record<ChangelogSource, Section[]>>;
  /** Keyed `baseline→target`. */
  entries: Record<string, ShardEntry>;
}

export interface ShardIndex {
  format: number;
  stalemap: string;
  surfaceFormat: number;
  /**
   * Package name → its shard's latest version, content hash, and when the registry was read for
   * it: the shard's `times` lists every release up to then.
   */
  packages: Record<string, { latest: string; sha: string; checked: string }>;
}

export const entryKey = (baseline: string, target: string) => `${baseline}→${target}`;

/** `@ai-sdk/openai` → `@ai-sdk+openai.json` (npm names can't contain "+"). */
export const shardFile = (name: string) => `${name.replace("/", "+")}.json`;

export const shardSha = (text: string) => sha256(text).slice(0, 16);

export function precomputedEnabled(): boolean {
  return !/^(1|true|yes|on)$/i.test(process.env.STALEMAP_NO_PRECOMPUTED ?? "");
}

/** `$STALEMAP_PRECOMPUTED_URL` with this format's folder, or undefined when it isn't set. */
export function precomputedBaseUrl(): string | undefined {
  const url = process.env.STALEMAP_PRECOMPUTED_URL;
  if (!url) return undefined;
  return `${url.endsWith("/") ? url : url + "/"}${formatDir}/`;
}

const DETAIL_TEXT = 90;
const hashed = (text: string) => sha256(text).slice(0, 12);

/**
 * The part of two surfaces `diffSurfaces` can tell apart, which is much smaller than the surfaces:
 * - exports identical in both versions are dropped (they never produce a change), except mirror
 *   namespaces, whose flag resolves `z.object` to the root's `object`;
 * - exports in one version only keep what rename detection and the notes read;
 * - for exports in both versions, members identical in both are dropped, other members' text
 *   (only ever compared) becomes a hash, and declaration text past what a note quotes becomes a
 *   prefix plus a hash.
 * The precompute script checks every entry replays to the live report. If `diffSurfaces` starts
 * reading more than this keeps, bump SHARD_FORMAT.
 */
export function trimSides(sides: SubpathSides): SubpathSides {
  if (!sides.surfaces) return sides;
  const [before, after] = sides.surfaces;
  const keptBefore: Surface = {};
  const keptAfter: Surface = {};
  for (const [k, item] of Object.entries(before)) {
    if (!(k in after)) keptBefore[k] = oneSided(item);
    else if (JSON.stringify(item) !== JSON.stringify(after[k])) keptBefore[k] = trimItem(item, after[k]);
    else if (item.mirror) keptBefore[k] = item;
  }
  for (const [k, item] of Object.entries(after)) {
    if (!(k in before)) keptAfter[k] = oneSided(item);
    else if (JSON.stringify(item) !== JSON.stringify(before[k])) keptAfter[k] = trimItem(item, before[k]);
    else if (item.mirror) keptAfter[k] = item;
  }
  return { ...sides, surfaces: [keptBefore, keptAfter] };
}

/** A removed or added export: its kind and text (for renames), deprecation, name and mirror flag. */
function oneSided(item: ApiItem): ApiItem {
  const { kind, text, deprecated, mirror, declName } = item;
  return { kind, text, ...(deprecated !== undefined ? { deprecated } : {}), ...(mirror ? { mirror } : {}), ...(declName ? { declName } : {}) };
}

/** `item` as compared against `other`, the same export in the other version. */
function trimItem(item: ApiItem, other: ApiItem): ApiItem {
  const out: ApiItem = { ...item };
  // A note quotes at most DETAIL_TEXT characters; the rest only has to compare equal or not.
  if (item.text.length > DETAIL_TEXT) out.text = `${item.text.slice(0, DETAIL_TEXT)}#${hashed(item.text)}`;
  if (item.members) {
    const members: Record<string, MemberInfo> = {};
    for (const [m, info] of Object.entries(item.members)) {
      const twin = other.members?.[m];
      if (other.members && twin && JSON.stringify(info) === JSON.stringify(twin)) continue;
      members[m] = { ...info, text: hashed(info.text) };
    }
    out.members = members;
  }
  return out;
}

/** Store a trimmed `SubpathSides` with its items interned in `items` (`ids`: item JSON → index). */
export function packSides(sides: SubpathSides, items: PackedItem[], ids: Map<string, number>): PackedSides {
  if (!sides.surfaces) return sides as PackedSides;
  const pack = (surface: Surface) => {
    const out: Record<string, number> = {};
    for (const [k, item] of Object.entries(surface)) {
      const packed = packItem(item);
      const json = JSON.stringify(packed);
      let id = ids.get(json);
      if (id === undefined) ids.set(json, (id = items.push(packed) - 1));
      out[k] = id;
    }
    return out;
  };
  return { ...sides, surfaces: [pack(sides.surfaces[0]), pack(sides.surfaces[1])] };
}

function packItem(item: ApiItem): PackedItem {
  if (!item.members) return item;
  const pack = (info: MemberInfo) => (info.deprecated === undefined ? `${info.optional ? "?" : ""}${info.text}` : info);
  return { ...item, members: Object.fromEntries(Object.entries(item.members).map(([m, info]) => [m, pack(info)])) };
}

function unpackItem(item: PackedItem): ApiItem {
  if (!item.members) return item as ApiItem;
  const unpack = (info: string | MemberInfo): MemberInfo =>
    typeof info === "string" ? { text: info.replace(/^\?/, ""), optional: info.startsWith("?") } : info;
  return { ...item, members: Object.fromEntries(Object.entries(item.members).map(([m, info]) => [m, unpack(info)])) };
}

function unpackSides(sides: PackedSides, items: PackedItem[]): SubpathSides {
  if (!sides.surfaces) return sides as SubpathSides;
  const unpack = (surface: Record<string, number>) => Object.fromEntries(Object.entries(surface).map(([k, id]) => [k, unpackItem(items[id])]));
  return { ...sides, surfaces: [unpack(sides.surfaces[0]), unpack(sides.surfaces[1])] };
}

/**
 * Replay an entry against the project's imports: the same diff and scoring live analysis runs.
 * Undefined when the project imports an entry point the shard didn't examine.
 */
export function projectEntry(
  shard: Shard,
  entry: ShardEntry,
  baseline: string,
  usage: Map<string, Set<string>> | undefined,
  usedNames: string[],
  allSubpaths = false,
): { types: TypeAnalysis; changelog: ChangelogResult } | undefined {
  // The same entry points live analysis visits, in the same order (see `analyzeTypes`).
  const keys = Object.keys(entry.types);
  const defaults = keys.slice(0, entry.defaultSubpaths);
  const discovered = allSubpaths ? [...defaults, ...(entry.testSubpaths ? keys.slice(-entry.testSubpaths) : [])] : defaults;
  const subpaths = usage?.size ? (allSubpaths ? [...new Set([...usage.keys(), ...discovered])] : [...usage.keys()]) : discovered;
  if (!subpaths.every((s) => Object.hasOwn(entry.types, s))) return undefined;
  const types = diffSides(shard.name, baseline, subpaths.map((s) => [s, unpackSides(entry.types[s], shard.items)]), usage);
  const cl = entry.changelog;
  const sections = cl ? cl.sections.map((i) => shard.changelogs[cl.source]![i]) : [];
  return { types, changelog: changelogFromSections({ source: cl?.source, sections }, new Set(usedNames)) };
}

/**
 * The report for `dep` from its shard, or undefined to analyze live: no shard, a different
 * format, a pinned version the shard doesn't end at, or a model whose baseline it lacks.
 */
export async function precomputedReport(
  dep: ProjectDep,
  base: PackageReport,
  opts: { model: ResolvedModel; marginDays: number; useCache: boolean },
  allSubpaths = false,
): Promise<PackageReport | undefined> {
  const loaded = await loadShard(dep.name, opts.useCache);
  if (!loaded) return undefined;
  const { shard, checked } = loaded;
  // An exact version in package.json needs no registry lookup; a range does.
  const pinned = dep.pinned ?? (Object.hasOwn(shard.times, dep.range) ? dep.range : undefined);
  if (!pinned || !Object.hasOwn(shard.times, pinned)) return undefined;
  // `times` lists every release up to `checked`; past that a newer one could be the baseline.
  if (daysBefore(opts.model.cutoff, opts.marginDays).getTime() > checked) return undefined;

  const report: PackageReport = { ...base, pinned, pinnedSource: base.pinnedSource ?? "package.json range", precomputed: true };
  const baseline = chooseBaseline({ time: shard.times }, opts.model.cutoff, opts.marginDays);
  if (!baseline) return { ...report, status: "new" };
  report.baseline = baseline;
  if (semver.lte(pinned, baseline.version)) return { ...report, status: "known" };

  const entry = shard.entries[entryKey(baseline.version, pinned)];
  const projected = entry && projectEntry(shard, entry, baseline.version, dep.usage?.subpaths, base.usedNames, allSubpaths);
  if (!projected) {
    debug(`${dep.name}: no precomputed ${entryKey(baseline.version, pinned)}${entry ? " for the entry points you import" : ""}; analyzing live`);
    return undefined;
  }
  return { ...report, status: "changed", major: isMajorBump(baseline.version, pinned), ...projected };
}

// ---------------------------------------------------------------------------
// Fetching. Requests name only files: index.json and <package>.json.

/** The base URL's cache folder: a mirror of the files fetched from it (shards only once verified). */
const mirrorDir = (base: string) => join(cacheDir(), "precomputed", sha256(base).slice(0, 12));

async function fetchFile(base: string, file: string): Promise<string | undefined> {
  if (/^https?:\/\//i.test(base)) {
    const ctrl = new AbortController();
    let timer = setTimeout(() => ctrl.abort(), CONNECT_TIMEOUT_MS);
    try {
      const res = await fetch(base + encodeURIComponent(file), { signal: ctrl.signal });
      clearTimeout(timer);
      timer = setTimeout(() => ctrl.abort(), BODY_TIMEOUT_MS);
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${base}${file}`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }
  // A local folder (or file: URL), e.g. a checkout's data/precomputed.
  const dir = base.startsWith("file:") ? fileURLToPath(base) : resolve(base);
  try {
    return await readFile(join(dir, file), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

interface CachedIndex {
  /** When to fetch the index again. */
  checkAfter: number;
  /** null: nothing at this URL. */
  index: ShardIndex | null;
}

/** Per process, so concurrent lookups share one fetch; expires when the cached copy would. */
const indexMemo = new Map<string, { until: number; index: Promise<ShardIndex | undefined> }>();

function loadIndex(base: string, useCache: boolean): Promise<ShardIndex | undefined> {
  const key = `${base}\0${useCache}`;
  const memo = indexMemo.get(key);
  if (memo && Date.now() < memo.until) return memo.index;
  const entry = { until: Infinity, index: Promise.resolve<ShardIndex | undefined>(undefined) };
  entry.index = fetchIndex(base, useCache).then(
    (cached) => {
      entry.until = cached.checkAfter;
      return usable(cached.index);
    },
    (err: Error) => {
      debug(`precomputed index unreadable (${err.message})`);
      entry.until = Date.now() + INDEX_RETRY_MS;
      return undefined;
    },
  );
  indexMemo.set(key, entry);
  return entry.index;
}

async function fetchIndex(base: string, useCache: boolean): Promise<CachedIndex> {
  const path = join(mirrorDir(base), "index.json");
  const cached = await readJson<CachedIndex>(path);
  if (useCache && cached && Date.now() < cached.checkAfter) return cached;
  let next: CachedIndex;
  try {
    const text = await fetchFile(base, "index.json");
    next = { checkAfter: Date.now() + (text ? INDEX_TTL_MS : INDEX_RETRY_MS), index: text ? (JSON.parse(text) as ShardIndex) : null };
    if (!text) debug(`no precomputed reports at ${base}`);
  } catch (err) {
    // Offline or a server error: keep what we had and retry later.
    debug(`precomputed reports unavailable (${(err as Error).message})${cached?.index ? "; using the cached index" : ""}`);
    next = { checkAfter: Date.now() + INDEX_RETRY_MS, index: cached?.index ?? null };
  }
  await writeJsonAtomic(path, next);
  return next;
}

function usable(index: ShardIndex | null): ShardIndex | undefined {
  if (!index) return undefined;
  if (index.format !== SHARD_FORMAT || index.surfaceFormat !== SURFACE_FORMAT) {
    debug(`precomputed reports have format ${index.format}/${index.surfaceFormat}, this stalemap reads ${SHARD_FORMAT}/${SURFACE_FORMAT}; analyzing live`);
    return undefined;
  }
  return index;
}

/**
 * The shard for `name` and when its release table was checked, verified against the index's
 * hash: CDNs cache files independently, so a newer index can arrive with an older shard.
 */
export async function loadShard(name: string, useCache: boolean): Promise<{ shard: Shard; checked: number } | undefined> {
  const base = precomputedBaseUrl();
  if (!base) return undefined;
  try {
    const meta = (await loadIndex(base, useCache))?.packages[name];
    if (!meta) return undefined;
    const path = join(mirrorDir(base), shardFile(name));
    let text: string | undefined = useCache ? await readFile(path, "utf8").catch(() => undefined) : undefined;
    if (!text || shardSha(text) !== meta.sha) {
      const retryPath = `${path}.retry`;
      const failed = await readJson<{ sha: string; until: number }>(retryPath);
      if (useCache && failed?.sha === meta.sha && Date.now() < failed.until) return undefined;
      const fetched = await fetchFile(base, shardFile(name)).catch((err: Error) => {
        debug(`${name}: precomputed shard unavailable (${err.message})`);
        return undefined;
      });
      if (!fetched || shardSha(fetched) !== meta.sha) {
        if (fetched) debug(`${name}: precomputed shard doesn't match the index (the host may still be updating); analyzing live`);
        await writeJsonAtomic(retryPath, { sha: meta.sha, until: Date.now() + SHARD_RETRY_MS });
        return undefined;
      }
      text = fetched;
      await writeFileAtomic(path, text);
    }
    const shard = JSON.parse(text) as Shard;
    if (shard.format !== SHARD_FORMAT || shard.surfaceFormat !== SURFACE_FORMAT || shard.name !== name) {
      debug(`${name}: precomputed shard has format ${shard.format}/${shard.surfaceFormat}; analyzing live`);
      return undefined;
    }
    return { shard, checked: Date.parse(meta.checked) || 0 };
  } catch (err) {
    debug(`${name}: precomputed shard unavailable (${(err as Error).message}); analyzing live`);
    return undefined;
  }
}
