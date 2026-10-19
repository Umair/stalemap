import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import semver from "semver";
import * as tar from "tar";
import { cacheDir, daysBefore, debug, fetchWithRetry, readJson, writeJsonAtomic } from "./util.js";

const PACKUMENT_TTL_MS = 12 * 60 * 60 * 1000;

export interface Packument {
  name: string;
  fetchedAt: number;
  distTags: Record<string, string>;
  /** version → ISO publish time */
  time: Record<string, string>;
  versions: Record<string, { tarball: string; deprecated?: string }>;
  /** https://github.com/owner/repo, when the package links to GitHub. */
  repository?: string;
  /** Package folder inside a monorepo (`repository.directory`), e.g. "packages/ai". */
  repositoryDirectory?: string;
}

function registryBase(): string {
  const r = process.env.STALEMAP_REGISTRY || process.env.npm_config_registry || "https://registry.npmjs.org/";
  return r.endsWith("/") ? r : r + "/";
}

const encodeName = (name: string) => name.replace("/", "%2f");

export async function getPackument(name: string, useCache: boolean): Promise<Packument> {
  const path = join(cacheDir(), "packuments", `${encodeName(name)}.json`);
  const cached = await readJson<Packument>(path);
  if (useCache && cached && Date.now() - cached.fetchedAt < PACKUMENT_TTL_MS) return cached;

  // The full document is required: only it carries per-version publish times.
  let res: Response;
  try {
    res = await fetchWithRetry(registryBase() + encodeName(name), { headers: { accept: "application/json" } });
  } catch (err) {
    // Offline: an old copy still says which versions exist and when they were published.
    if (cached) return cached;
    throw err;
  }
  if (!res.ok) {
    if (cached) return cached;
    throw new Error(`registry returned HTTP ${res.status} for ${name}`);
  }
  const raw = (await res.json()) as {
    "dist-tags"?: Record<string, string>;
    time?: Record<string, string>;
    versions?: Record<string, { dist?: { tarball?: string }; deprecated?: string; repository?: unknown }>;
    repository?: unknown;
  };
  const versions: Packument["versions"] = {};
  for (const [v, meta] of Object.entries(raw.versions ?? {})) {
    if (!meta.dist?.tarball) continue;
    versions[v] = { tarball: meta.dist.tarball, ...(meta.deprecated ? { deprecated: meta.deprecated } : {}) };
  }
  const latest = raw["dist-tags"]?.latest;
  const repoField = raw.versions?.[latest ?? ""]?.repository ?? raw.repository;
  const repo = repoUrl(repoField);
  const directory = (repoField as { directory?: string } | undefined)?.directory;
  const time: Record<string, string> = {};
  for (const [v, t] of Object.entries(raw.time ?? {})) if (versions[v]) time[v] = t;

  const doc: Packument = {
    name,
    fetchedAt: Date.now(),
    distTags: raw["dist-tags"] ?? {},
    time,
    versions,
    repository: repo,
    ...(typeof directory === "string" ? { repositoryDirectory: directory.replace(/^\.?\/|\/$/g, "") } : {}),
  };
  await writeJsonAtomic(path, doc);
  return doc;
}

function repoUrl(repo: unknown): string | undefined {
  const url = typeof repo === "string" ? repo : (repo as { url?: string } | undefined)?.url;
  if (!url) return undefined;
  // Accepts "github:owner/repo", "owner/repo", "git+https://github.com/owner/repo.git", "git@github.com:owner/repo".
  const short = url.match(/^(?:github:)?([\w.-]+\/[\w.-]+)$/);
  if (short) return `https://github.com/${short[1].replace(/\.git$/, "")}`;
  const m = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[#/].*)?$/);
  return m ? `https://github.com/${m[1]}/${m[2]}` : undefined;
}

export const isStable = (v: string) => semver.valid(v) !== null && semver.prerelease(v) === null;

/** A new major, or a minor bump within 0.x (breaking by convention). */
export function isMajorBump(from: string, to: string): boolean {
  const a = semver.parse(from)!;
  const b = semver.parse(to)!;
  if (b.major !== a.major) return true;
  return a.major === 0 && b.minor !== a.minor;
}

export interface Baseline {
  version: string;
  publishedAt: string;
}

/**
 * The newest stable release the model could have learned well: published at least
 * `marginDays` before its training cutoff. Models see the last weeks before a cutoff
 * least, so the margin keeps those releases out of the "known" side.
 */
export function chooseBaseline(p: Pick<Packument, "time">, cutoff: Date, marginDays: number): Baseline | undefined {
  const limit = daysBefore(cutoff, marginDays).getTime();
  let best: string | undefined;
  for (const [v, t] of Object.entries(p.time)) {
    if (!isStable(v) || Date.parse(t) > limit) continue;
    if (!best || semver.gt(v, best)) best = v;
  }
  return best ? { version: best, publishedAt: p.time[best] } : undefined;
}

export function resolveRange(p: Packument, range: string): string | undefined {
  if (p.distTags[range]) return p.distTags[range];
  if (range === "*" || range === "" || range === "latest") return p.distTags.latest;
  const stable = Object.keys(p.versions).filter(isStable);
  return semver.maxSatisfying(stable, range) ?? semver.maxSatisfying(Object.keys(p.versions), range, { includePrerelease: true }) ?? undefined;
}

/** Releases strictly after `from` and up to `to` (including prereleases of the versions in between). */
export function versionsBetween(p: Packument, from: string, to: string): string[] {
  return Object.keys(p.versions)
    .filter((v) => semver.valid(v) && semver.gt(v, from) && semver.lte(v, to))
    .sort(semver.compare);
}

/** Only these files are needed: type declarations, manifests (for exports maps) and changelogs. */
function keepEntry(path: string): boolean {
  const p = path.replace(/^[^/]+\//, ""); // drop the tarball's top-level folder ("package/")
  if (p.includes("node_modules/")) return false;
  if (/\.d\.[cm]?ts$/.test(p)) return true;
  if (p === "package.json" || p.endsWith("/package.json")) return true;
  return /^(CHANGELOG|HISTORY|CHANGES|RELEASES)(\.md)?$/i.test(p);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Unpack `name@version` into `<root>/node_modules/<name>` (once). */
async function extractInto(root: string, p: Packument, version: string): Promise<string> {
  const dir = join(root, "node_modules", p.name);
  const marker = join(dir, ".stalemap-complete");
  if (await exists(marker)) return dir;
  const tarball = p.versions[version]?.tarball;
  if (!tarball) throw new Error(`no tarball for ${p.name}@${version}`);
  debug(`downloading ${p.name}@${version}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const res = await fetchWithRetry(tarball);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} downloading ${tarball}`);
  await pipeline(
    Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
    tar.x({ cwd: dir, strip: 1, filter: (path: string) => keepEntry(path) }),
  );
  await writeFile(marker, new Date().toISOString());
  return dir;
}

/**
 * Dependencies from the same family whose types the package re-exports, e.g. `ai` → `@ai-sdk/*`,
 * `@tanstack/react-query` → `@tanstack/query-core`. Fetching them lets re-exported APIs resolve.
 */
function isSibling(pkg: string, dep: string): boolean {
  if (dep.startsWith("@types/")) return false;
  const scope = (n: string) => (n.startsWith("@") ? n.split("/")[0] : undefined);
  if (scope(pkg) && scope(pkg) === scope(dep)) return true;
  const base = pkg.replace(/^@[^/]+\//, "");
  return scope(dep) === `@${base}` || !!scope(dep)?.startsWith(`@${base}-`) || dep.startsWith(`${base}-`);
}

const MAX_SIBLINGS = 6;

/** Cache folder whose node_modules holds `name@version` and its sibling packages. */
export function packageRoot(name: string, version: string): string {
  return join(cacheDir(), "pkgs", `${encodeName(name)}@${version}`);
}

/**
 * Download and unpack (once) the declaration files of `name@version`, laid out as
 * `<root>/node_modules/<name>` so the package's self-imports (`next/dist/...`) resolve.
 * Returns the package directory.
 */
export async function fetchPackageFiles(p: Packument, version: string, useCache = true): Promise<string> {
  const root = packageRoot(p.name, version);
  const dir = await extractInto(root, p, version);
  const siblingsMarker = join(root, ".siblings-complete");
  if (await exists(siblingsMarker)) return dir;

  const manifest = await readJson<{ dependencies?: Record<string, string> }>(join(dir, "package.json"));
  const siblings = Object.entries(manifest?.dependencies ?? {})
    .filter(([dep, range]) => isSibling(p.name, dep) && semver.validRange(range))
    .slice(0, MAX_SIBLINGS);
  const publishedAt = Date.parse(p.time[version] ?? "") || Date.now();
  for (const [dep, range] of siblings) {
    try {
      const sp = await getPackument(dep, useCache);
      // What a fresh install would have picked shortly after this release.
      const candidates = Object.keys(sp.versions).filter((v) => Date.parse(sp.time[v] ?? "") <= publishedAt + 7 * 864e5);
      const v = semver.maxSatisfying(candidates, range) ?? semver.maxSatisfying(Object.keys(sp.versions), range);
      if (v) await extractInto(root, sp, v);
    } catch (err) {
      debug(`sibling ${dep} of ${p.name}@${version} skipped: ${(err as Error).message}`);
    }
  }
  await writeFile(siblingsMarker, new Date().toISOString());
  return dir;
}
