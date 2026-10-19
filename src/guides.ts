import semver from "semver";
import type { Provider } from "./probe/providers.js";
import type { Packument } from "./registry.js";
import { cacheDir, debug, fetchWithRetry, readJson, sha256, truncate, writeJsonAtomic } from "./util.js";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

/**
 * Notes from official upgrade guides. Behavior changes that never reach a type signature (a new
 * default, a config option that moved to another file, a renamed file convention) are where agents
 * go wrong and where type diffs and changelog heuristics have nothing to say. Vendors explain them
 * in their upgrade guides, so: find the guides for the versions between the model's baseline and the
 * pinned one, and have Claude turn them into short notes, each tied to a phrase the guide contains.
 */

export interface GuideNote {
  text: string;
  /** default | moved | renamed | removed | behavior | convention | cli */
  kind?: string;
  /** Config keys, APIs or file names the note is about, old names first (`images.qualities`, `middleware.ts`). */
  keys?: string[];
  /** Exact phrase from the guide the note rests on (checked against the guide text). */
  quote: string;
  /** Repo path of the guide it came from. */
  source: string;
}

export interface GuideSource {
  repo: string;
  path: string;
}

/** Packages whose docs (and so their upgrade guides) live outside the package's own repository. */
const DOCS_REPOS: Record<string, string> = {
  prisma: "prisma/docs",
  "@prisma/client": "prisma/docs",
  tailwindcss: "tailwindlabs/tailwindcss.com",
  typescript: "microsoft/TypeScript-Website",
  react: "reactjs/react.dev",
  "react-dom": "reactjs/react.dev",
};

/** Folders that hold docs, at a repository's top level. */
const DOCS_DIRS = /^(?:docs?|documentation|content|website|site|apps|packages|src)$/i;
const GUIDE_WORDS = /(?:upgrad|migrat|breaking|release-notes|whats?-new|what-s-new|changelog)/i;
const NOT_GUIDES = /(?:^|\/)(?:node_modules|test|tests|__tests__|fixtures?|examples?|e2e|codemods?|blog\/20(?:1|2[0-3]))(?:\/|$)/i;
/** Translations: guides are read in English. */
const TRANSLATION = /\/(?:zh|ja|ko|es|fr|de|pt|ru|it|tr|uk|vi|id|fa|ar|pl|hi)(?:-[a-z]{2,4})?\//i;
const MAX_GUIDE_CHARS = 60_000;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ownerRepo = (url: string | undefined): string | undefined => url?.match(/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?(?:[/#]|$)/)?.[1];

let tokenPromise: Promise<string | undefined> | undefined;
function githubToken(): Promise<string | undefined> {
  tokenPromise ??= (async () => {
    if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    try {
      const { stdout } = await promisify(execFile)("gh", ["auth", "token"], { timeout: 3000 });
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  })();
  return tokenPromise;
}

async function cached<T>(key: string, load: () => Promise<T>, useCache: boolean): Promise<T> {
  const path = join(cacheDir(), "guides", `${sha256(key).slice(0, 24)}.json`);
  const hit = await readJson<{ at: number; value: T }>(path);
  if (useCache && hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await load();
  await writeJsonAtomic(path, { at: Date.now(), value });
  return value;
}

interface TreeEntry {
  path: string;
  type: string;
  sha: string;
}

async function tree(repo: string, ref: string, recursive: boolean): Promise<TreeEntry[]> {
  const token = await githubToken();
  const res = await fetchWithRetry(`https://api.github.com/repos/${repo}/git/trees/${ref}${recursive ? "?recursive=1" : ""}`, {
    headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`GitHub tree for ${repo}: HTTP ${res.status}`);
  return ((await res.json()) as { tree: TreeEntry[] }).tree;
}

/** Majors after the baseline up to the pinned version: 15.4.0 → 16.4.2 is [16]; 4.3.16 → 7.0.1 is [5, 6, 7]. */
export function targetMajors(from: string, to: string): number[] {
  const out: number[] = [];
  for (let m = semver.major(from) + 1; m <= semver.major(to); m++) out.push(m);
  // A minor release can carry an upgrade guide too (zod 4.0 → 4.3): then the pinned major.
  return out.length ? out : [semver.major(to)];
}

/** How likely `path` is a guide for one of `majors` (0 = not a guide). */
export function guideScore(path: string, majors: number[]): number {
  if (!/\.mdx?$/i.test(path) || NOT_GUIDES.test(path) || TRANSLATION.test(path) || !GUIDE_WORDS.test(path)) return 0;
  const lower = path.toLowerCase();
  // A major as its own token: "version-16", "v7", "prisma-7", "typescript 6.0", "migration-guide-5-0".
  const hit = majors.filter((m) => new RegExp(`(?:^|[^0-9.])v?${m}(?:[-.]0)*(?:[^0-9]|$)`).test(lower.split("/").slice(-2).join("/")));
  if (!hit.length) return 0;
  let score = 10 + Math.max(...hit);
  if (/upgrad|migrat/.test(lower)) score += 5;
  if (/\/(?:app|guides?|upgrading|migration-guides?|release-notes)\//.test(lower)) score += 2;
  if (/pages\//.test(lower)) score -= 3; // Next's pages-router copy of the same guide
  return score;
}

/** The guide files for `name` from `from` to `to`, best first: at most one per target major, up to 3. */
export async function findGuides(p: Packument, from: string, to: string, useCache: boolean): Promise<GuideSource[]> {
  const repo = DOCS_REPOS[p.name] ?? ownerRepo(p.repository);
  if (!repo) return [];
  const majors = targetMajors(from, to);
  return cached(
    `find\0${repo}\0${p.name}\0${majors.join(",")}`,
    async () => {
      try {
        const top = await tree(repo, "HEAD", false);
        const dirs = top.filter((e) => e.type === "tree" && DOCS_DIRS.test(e.path));
        const scored: Array<{ path: string; score: number }> = [];
        const all: string[] = [];
        for (const d of dirs) {
          for (const e of await tree(repo, d.sha, true)) {
            if (e.type !== "blob") continue;
            const path = `${d.path}/${e.path}`;
            all.push(path);
            const score = guideScore(path, majors);
            if (score) scored.push({ path, score });
          }
        }
        scored.sort((a, b) => b.score - a.score || a.path.length - b.path.length);
        // One guide for every version (vitest's docs/guide/migration.md): a generic name, kept if its
        // text talks about a target major.
        if (!scored.length) {
          const generic = all
            .filter((path) => /(?:^|\/)(?:migrat|upgrad)[\w-]*(?:\/index)?\.mdx?$/i.test(path) && !NOT_GUIDES.test(path) && !TRANSLATION.test(path))
            .sort((a, b) => a.split("/").length - b.split("/").length)
            .slice(0, 3);
          const short = p.name.replace(/^@[^/]+\//, "");
          for (const path of generic) {
            const text = await guideText({ repo, path }, useCache);
            const mentions = majors.some((m) => new RegExp(`\\b(?:${short}|version|v)\\s*${m}(?:\\.0)?\\b`, "i").test(text ?? ""));
            if (mentions) return [{ repo, path }];
          }
          return [];
        }
        const picked: GuideSource[] = [];
        const seenMajor = new Set<number>();
        for (const s of scored) {
          const major = majors.find((m) => guideScore(s.path, [m]) > 0)!;
          if (seenMajor.has(major)) continue;
          seenMajor.add(major);
          picked.push({ repo, path: s.path });
          if (picked.length >= 3) break;
        }
        debug(`guides for ${p.name} ${from} → ${to}: ${picked.map((g) => g.path).join(", ") || "none"}`);
        return picked;
      } catch (err) {
        debug(`guides for ${p.name}: ${(err as Error).message}`);
        return [];
      }
    },
    useCache,
  );
}

export async function guideText(g: GuideSource, useCache: boolean): Promise<string | undefined> {
  return cached(
    `text\0${g.repo}\0${g.path}`,
    async () => {
      const res = await fetchWithRetry(`https://raw.githubusercontent.com/${g.repo}/HEAD/${g.path.split("/").map(encodeURIComponent).join("/")}`);
      return res.ok ? await res.text() : undefined;
    },
    useCache,
  );
}

const normalize = (s: string) => s.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

function prompt(name: string, from: string, to: string, known: string[], guides: Array<{ source: GuideSource; text: string }>, max: number): string {
  return [
    `A coding agent's knowledge of the npm package \`${name}\` stops at version ${from}: that's what it saw in training. The project it works on uses ${name} ${to}.`,
    `Below are the official upgrade guides for the versions in between. List the changes the agent is most likely to get wrong, most harmful first. Prefer changes that still compile or run but behave differently: changed defaults, config options that moved, were renamed or removed, file and folder conventions, CLI flags, environment variables and runtime behavior. Leave out renames and removals a type checker reports by itself, unless the guide gives a replacement the agent couldn't guess.`,
    `Each note is one or two sentences addressed to the agent: what changed, with the old and new config keys, APIs, file names or values in backticks, and what to write now. For a changed default, give the old and new values and how to keep the old behavior. Name the version when it matters.`,
    known.length ? `Already covered (don't repeat): ${known.slice(0, 15).join(" | ")}` : "",
    `At most ${max} notes. For each, "quote" must be a short phrase copied exactly from the guide that the note rests on; "kind" is one of default (a default value changed), moved, renamed, removed, behavior, convention (files and folders) or cli; "keys" lists the config keys (dotted, like \`images.qualities\`), APIs or file names it's about, old names first.`,
    `Reply with JSON only: {"notes":[{"text":"…","kind":"…","keys":["…"],"quote":"…","source":"<guide path>"}]}`,
    ...guides.map((g) => `\n===== ${g.source.repo}/${g.source.path}\n${truncate(g.text, MAX_GUIDE_CHARS)}`),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseNotes(reply: string): GuideNote[] {
  const json = reply.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return [];
  try {
    const notes = (JSON.parse(json) as { notes?: Array<Partial<GuideNote>> }).notes ?? [];
    return notes
      .filter((n): n is GuideNote => typeof n.text === "string" && typeof n.quote === "string" && n.text.length > 10)
      .map((n) => ({
        text: n.text.trim(),
        quote: n.quote.trim(),
        source: String(n.source ?? ""),
        ...(typeof n.kind === "string" ? { kind: n.kind } : {}),
        ...(Array.isArray(n.keys) ? { keys: n.keys.filter((k): k is string => typeof k === "string").slice(0, 6) } : {}),
      }));
  } catch {
    return [];
  }
}

/**
 * Notes from the upgrade guides between `from` and `to`. `provider` undefined means cache only
 * (the guard). Notes whose quote isn't in the guide are dropped: the guide has to say it.
 */
export async function guideNotes(opts: {
  p: Packument;
  from: string;
  to: string;
  known: string[];
  provider?: Provider;
  model: string;
  max: number;
  useCache: boolean;
}): Promise<GuideNote[]> {
  // The latest notes for this package and version range, so cache-only callers (the guard, in a hook)
  // never go to GitHub.
  const latest = join(cacheDir(), "guides", `latest-${sha256(JSON.stringify([4, opts.p.name, opts.from, opts.to, opts.model, opts.max])).slice(0, 24)}.json`);
  if (!opts.provider) return (await readJson<{ notes: GuideNote[] }>(latest))?.notes ?? [];
  const sources = await findGuides(opts.p, opts.from, opts.to, opts.useCache);
  if (!sources.length) return [];
  const guides = (await Promise.all(sources.map(async (source) => ({ source, text: await guideText(source, opts.useCache) })))).filter(
    (g): g is { source: GuideSource; text: string } => !!g.text,
  );
  if (!guides.length) return [];
  const key = join(cacheDir(), "guides", `notes-${sha256(JSON.stringify([4, opts.p.name, opts.from, opts.to, opts.model, opts.max, guides.map((g) => sha256(g.text))])).slice(0, 24)}.json`);
  const hit = await readJson<{ notes: GuideNote[] }>(key);
  if (hit && opts.useCache) {
    await writeJsonAtomic(latest, hit);
    return hit.notes;
  }
  // One guide at a time: in a multi-major jump (ai 4 → 7) each major's guide gets its own notes,
  // instead of the newest one taking all of them.
  let notes: GuideNote[] = [];
  try {
    const perGuide = Math.max(4, Math.ceil(opts.max / guides.length));
    for (const g of guides) {
      const reply = await opts.provider.complete(opts.model, prompt(opts.p.name, opts.from, opts.to, opts.known, [g], perGuide));
      const text = normalize(g.text);
      notes.push(...parseNotes(reply).filter((n) => n.quote.length >= 8 && text.includes(normalize(n.quote))).slice(0, perGuide).map((n) => ({ ...n, source: g.source.path })));
    }
  } catch (err) {
    debug(`guide notes for ${opts.p.name}: ${(err as Error).message}`);
    return []; // don't cache provider errors
  }
  await writeJsonAtomic(key, { notes });
  await writeJsonAtomic(latest, { notes });
  return notes;
}
