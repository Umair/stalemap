import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import semver from "semver";
import type { Packument } from "./registry.js";
import { cacheDir, debug, fetchWithRetry, readJson, sha256, truncate, writeJsonAtomic } from "./util.js";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_RELEASE_PAGES = 10;

export interface ChangelogItem {
  version: string;
  heading?: string;
  /** Cleaned single-paragraph text (inline code kept, code blocks dropped). */
  text: string;
  /** Raw text including code blocks, for the optional LLM pass. */
  raw: string;
  score: number;
}

export interface ChangelogResult {
  source?: "package CHANGELOG" | "repository CHANGELOG" | "GitHub releases";
  versions: string[];
  items: ChangelogItem[];
}

export interface Section {
  version: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Parsing

const VERSION_IN_HEADING = /(?:^|[\s[(@v])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?=$|[\s\])(,:])/;

/** Split a CHANGELOG into one section per version heading. */
export function parseChangelogSections(md: string): Section[] {
  const sections: Section[] = [];
  let current: { version: string; lines: string[] } | undefined;
  let inFence = false;
  for (const line of md.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(/^(#{1,4})\s+(.*)$/);
    const v = h ? h[2].match(VERSION_IN_HEADING) : null;
    if (v && semver.valid(v[1])) {
      if (current) sections.push({ version: current.version, body: current.lines.join("\n") });
      current = { version: v[1], lines: [] };
      continue;
    }
    current?.lines.push(line);
  }
  if (current) sections.push({ version: current.version, body: current.lines.join("\n") });
  return sections;
}

const COMMIT_PREFIX = /^\s*(?:`?[0-9a-f]{7,40}`?:?\s+|\[`?[0-9a-f]{7,40}`?\]\([^)]*\)\s*)/;
/** Conventional-commit type, e.g. "fix!:", "feat(core):"; the "!" marks a breaking change. */
const CONVENTIONAL = /^(?:feat|fix|chore|refactor|perf|docs|test|build|ci|style|revert|breaking|types?)(?:\s?\([^)]*\))?(!)?:\s+/i;

export function isConventionalBreaking(raw: string): boolean {
  return CONVENTIONAL.exec(raw.replace(COMMIT_PREFIX, ""))?.[1] === "!";
}

export function cleanItemText(text: string): string {
  const fromCommitList = COMMIT_PREFIX.test(text);
  let out = text
    .replace(/&nbsp;/g, " ")
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(COMMIT_PREFIX, "") // changesets / commit-list hash prefix
    .replace(CONVENTIONAL, "")
    .replace(/\n\s*[-*+]\s+/g, "; ") // nested bullets
    .replace(/(^|\s)#{1,6}\s+/g, "$1") // headings inside an item
    .replace(/Thanks \[@[^\]]+\]\([^)]*\)!\s*-?\s*/g, "")
    .replace(/\b(?:closes|fixes|resolves)\s+(?:\[?#\d+\]?(?:\([^)]*\))?[\s,]*(?:and\s+)?)+\.?/gi, "")
    .replace(/\s*(?:-\s+)?by @[\w-]+[^\n;]{0,120}? in https?:\/\/\S+/g, "")
    .replace(/\s*in https?:\/\/github\.com\/\S+\/pull\/\d+/g, "")
    .replace(/\(\[#?\d+\]\([^)]*\)\)/g, "")
    .replace(/\[#\d+\]\([^)]*\)/g, "")
    .replace(/\((?:#\d+(?:,\s*)?)+\)/g, "")
    .replace(/\(\[[0-9a-f]{7,40}\]\([^)]*\)\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+(?:-\s+)?\([0-9a-f]{5,10}\)(?=\s*(?:;|\n|$))/g, "") // "… - (76fb7)": a commit hash
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*[\w\s/-]{1,20}:\s+(?=\S)/, (m) => (/^\s*(api|core|types?|deps?|internal|client|server)\s*:/i.test(m) ? "" : m))
    .replace(/\s+/g, " ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .trim()
    .replace(/^(?:[,;]\s*)+/, "")
    .replace(/:?\s*#\d+$/, "") // trailing "…: #84179" PR reference
    .replace(/^[-–:;]\s*/, "");
  // Commit lists end with the author: "remove deprecated methods (Jane Doe)".
  if (fromCommitList) out = out.replace(/\s*\([^()]{2,40}\)$/, "");
  return out;
}

const SECTION_BOOST: Array<[RegExp, number]> = [
  [/breaking|major|⚠|removal|migration|upgrade/i, 6],
  [/deprecat/i, 4],
  [/minor|feature|added|new/i, 0],
  [/patch|fix|bug|perf|chore|internal|docs|test|misc/i, -2],
  [/^commits?:?$/i, -3],
];

const KEYWORDS: Array<[RegExp, number]> = [
  [/(?<!\b(?:no|non|without|any|not)[\s-]+(?:\w+\s+)?)\bbreaking\b/i, 5],
  [/\b(removed?|drops?|dropped|no longer)\b/i, 3],
  [/\brenamed?\b/i, 3],
  [/\bdeprecat/i, 3],
  [/\binstead\b|\breplaced?\b|\bin favou?r of\b/i, 2],
  [/\bdefaults?\b/i, 2],
  [/\bmigrat/i, 2],
  [/\bnow (requires?|returns?|throws?|uses?|is|are|defaults?)\b/i, 2],
  [/\bmust\b|\brequired?\b/i, 1],
  [/\btypo\b|\bdocs?\b|\breadme\b|\bchangelog\b/i, -3],
  [/\bchore\b|\bbump(ed)?\b|\bci\b|\btests?\b|\binternal\b|\brefactor/i, -3],
  [/\bfix(e[sd])?\b/i, -1],
];

function scoreItem(text: string, raw: string, bullet: boolean, heading: string | undefined, version: string, usedNames: Set<string>): number {
  let score = isConventionalBreaking(raw) ? 5 : 0;
  if (!bullet) score -= 2; // prose paragraphs explain; bullets are the actual change list
  if (heading) for (const [re, w] of SECTION_BOOST) if (re.test(heading)) { score += w; break; }
  for (const [re, w] of KEYWORDS) if (re.test(text)) score += w;
  const parsed = semver.parse(version);
  if (parsed && parsed.minor === 0 && parsed.patch === 0) score += 2; // major release (or its prereleases)
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const id = m[1].replace(/\(.*$/, "").split(/[.\s]/).pop() ?? "";
    if (id && usedNames.has(id)) {
      score += 4;
      break;
    }
  }
  if (text.length < 25) score -= 2;
  return score;
}

export const GENERIC_HEADING =
  /^(breaking changes?|major changes|minor changes|patch changes|features?|new features|bug ?fixes|fixes|changes|changed|added|removed|deprecated|deprecations?|security|what'?s changed|commits?|other|misc(ellaneous)?|internal|chores?|dependencies|documentation|performance|improvements?|core changes|misc changes|credits|contributors|highlights|summary|notes?|upgrade guide|migration guide)$/i;

/** A heading that names a specific change rather than a category. */
function isDescriptiveHeading(h: string): boolean {
  const plain = h.replace(/[^\p{L}\p{N}`'_ ./-]/gu, "").trim();
  if (GENERIC_HEADING.test(plain) || /\b(changes|fixes|features|updates|improvements)$/i.test(plain)) return false;
  return plain.split(/\s+/).length >= 3 && /[⚠!]|\bno longer\b|\bremov|\brenam|\bdeprecat|\bbreaking\b|\bnow\b|\binstead\b|\bstricter\b|\bdefault/i.test(h);
}

/** Turn a section body into scored bullet items. */
export function extractItems(section: Section, usedNames: Set<string>): ChangelogItem[] {
  const items: ChangelogItem[] = [];
  let heading: string | undefined;
  let cur: { lines: string[]; bullet: boolean } | undefined;
  let afterBlank = false;
  let descriptive = false;
  let inFence = false;
  const flush = () => {
    if (!cur) return;
    const raw = cur.lines.join("\n").trim();
    const bullet = cur.bullet;
    const underTitle = descriptive && !bullet;
    cur = undefined;
    if (!raw || /^updated dependencies/i.test(raw.replace(/^[0-9a-f]{7,40}:\s*/, ""))) return;
    const text = cleanItemText(raw);
    if (!text) return;
    const score = scoreItem(text, raw, bullet, heading, section.version, usedNames) - (underTitle ? 3 : 0);
    items.push({ version: section.version, heading, text, raw, score });
  };

  for (const line of section.body.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence || /^\s*(```|~~~)/.test(line)) {
      cur?.lines.push(line);
      continue;
    }
    const h = line.match(/^#{1,6}\s+(.*)$/) ?? line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (h) {
      flush();
      heading = h[1].trim();
      // "⚠️ Chained checks no longer overwrite each other" is itself the change; the prose under it explains.
      descriptive = isDescriptiveHeading(heading);
      if (descriptive) {
        const text = cleanItemText(heading.replace(/^[^\w`]+/u, ""));
        if (text) items.push({ version: section.version, heading, text, raw: heading, score: scoreItem(text, heading, true, heading, section.version, usedNames) });
      }
      continue;
    }
    const bullet = line.match(/^ ?[-*+]\s+(.*)$/);
    if (bullet) {
      flush();
      cur = { lines: [bullet[1]], bullet: true };
      afterBlank = false;
      continue;
    }
    if (!line.trim()) {
      afterBlank = true;
      continue;
    }
    // A bullet keeps its indented paragraphs; anything else after a blank line starts a new item.
    const continues = cur && (!afterBlank || (cur.bullet && /^\s{2,}/.test(line)));
    if (continues) cur!.lines.push(line);
    else {
      flush();
      cur = { lines: [line], bullet: false }; // prose paragraph (common in GitHub releases)
    }
    afterBlank = false;
  }
  flush();
  return items;
}

// ---------------------------------------------------------------------------
// Sources

async function localChangelog(pkgDir: string): Promise<string | undefined> {
  try {
    const name = (await readdir(pkgDir)).find((f) => /^(CHANGELOG|HISTORY|CHANGES|RELEASES)(\.md)?$/i.test(f));
    return name ? await readFile(join(pkgDir, name), "utf8") : undefined;
  } catch {
    return undefined;
  }
}

function ownerRepo(repoUrl: string | undefined): [string, string] | undefined {
  const m = repoUrl?.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
  return m ? [m[1], m[2]] : undefined;
}

async function cachedText(key: string, load: () => Promise<string | undefined>, useCache: boolean): Promise<string | undefined> {
  const path = join(cacheDir(), "changelogs", `${sha256(key).slice(0, 24)}.json`);
  const hit = await readJson<{ at: number; text: string | null }>(path);
  if (useCache && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.text ?? undefined;
  const text = await load();
  await writeJsonAtomic(path, { at: Date.now(), text: text ?? null });
  return text;
}

async function repoChangelog(p: Packument, useCache: boolean, strict = false): Promise<string | undefined> {
  const or = ownerRepo(p.repository);
  if (!or) return undefined;
  const dir = p.repositoryDirectory ? `${p.repositoryDirectory}/` : "";
  const candidates = [`${dir}CHANGELOG.md`, ...(dir ? ["CHANGELOG.md"] : [])];
  for (const file of candidates) {
    const url = `https://raw.githubusercontent.com/${or[0]}/${or[1]}/HEAD/${file}`;
    const text = await cachedText(
      url,
      async () => {
        const res = await fetchWithRetry(url);
        if (strict && !res.ok && res.status !== 404) throw new Error(`HTTP ${res.status} for ${url}`);
        return res.ok ? await res.text() : undefined;
      },
      useCache,
    );
    if (text) return text;
  }
  return undefined;
}

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

interface Release {
  tag_name: string;
  name?: string;
  body?: string;
  published_at?: string;
  draft?: boolean;
}

/** Version from a release tag: "v1.2.3", "1.2.3", "pkg@1.2.3", "@scope/pkg@1.2.3". */
export function versionFromTag(tag: string, pkgName: string): string | undefined {
  const m = tag.match(/^(?:(.+)@)?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/);
  if (!m || !semver.valid(m[2])) return undefined;
  if (m[1] && m[1] !== pkgName) return undefined;
  return m[2];
}

async function githubReleases(p: Packument, since: Date, useCache: boolean, strict = false): Promise<Section[]> {
  const or = ownerRepo(p.repository);
  if (!or) return [];
  const key = `releases:${or.join("/")}:${p.name}:${since.toISOString().slice(0, 10)}`;
  const text = await cachedText(
    key,
    async () => {
      const token = await githubToken();
      const headers: Record<string, string> = { accept: "application/vnd.github+json", "user-agent": "stalemap" };
      if (token) headers.authorization = `Bearer ${token}`;
      const sections: Section[] = [];
      for (let page = 1; page <= MAX_RELEASE_PAGES; page++) {
        const res = await fetchWithRetry(`https://api.github.com/repos/${or[0]}/${or[1]}/releases?per_page=100&page=${page}`, { headers });
        if (!res.ok) {
          if (strict && res.status !== 404) throw new Error(`GitHub releases for ${or.join("/")}: HTTP ${res.status}`);
          debug(`GitHub releases for ${or.join("/")}: HTTP ${res.status}${token ? "" : " (set GITHUB_TOKEN or log in with gh for a higher rate limit)"}`);
          break;
        }
        const batch = (await res.json()) as Release[];
        for (const r of batch) {
          if (r.draft) continue;
          const v = versionFromTag(r.tag_name, p.name);
          if (v && r.body) sections.push({ version: v, body: r.body });
        }
        const last = batch[batch.length - 1]?.published_at;
        if (batch.length < 100 || (last && Date.parse(last) < since.getTime())) break;
      }
      return JSON.stringify(sections);
    },
    useCache,
  );
  try {
    return text ? (JSON.parse(text) as Section[]) : [];
  } catch {
    return [];
  }
}

const inRange = (v: string, from: string, to: string) => semver.gt(v, from) && semver.lte(v, to);

/** Collect and score the changelog entries for releases after `from` up to `to`. */
export async function collectChangelog(opts: {
  p: Packument;
  pkgDir: string;
  from: string;
  to: string;
  usedNames: Set<string>;
  useCache: boolean;
}): Promise<ChangelogResult> {
  return changelogFromSections(await changelogSections(opts), opts.usedNames);
}

export interface ChangelogSections {
  source?: ChangelogResult["source"];
  sections: Section[];
}

/**
 * The release notes for versions after `from` up to `to`: the package's CHANGELOG, else the
 * repository's, else GitHub releases. `strict` throws on fetch errors instead of carrying on
 * without notes (precompute builds; a rate-limited build must not publish empty notes).
 */
export async function changelogSections(opts: {
  p: Packument;
  pkgDir: string;
  from: string;
  to: string;
  useCache: boolean;
  strict?: boolean;
}): Promise<ChangelogSections> {
  const { p, from, to } = opts;
  const pick = (sections: Section[]) => sections.filter((s) => inRange(s.version, from, to));

  let source: ChangelogResult["source"];
  let sections: Section[] = [];

  const local = await localChangelog(opts.pkgDir);
  if (local) {
    sections = pick(parseChangelogSections(local));
    if (sections.length) source = "package CHANGELOG";
  }
  if (!sections.length) {
    try {
      const remote = await repoChangelog(p, opts.useCache, opts.strict);
      if (remote) {
        sections = pick(parseChangelogSections(remote));
        if (sections.length) source = "repository CHANGELOG";
      }
    } catch (err) {
      if (opts.strict) throw err;
      debug(`repository CHANGELOG for ${p.name}: ${(err as Error).message}`);
    }
  }
  if (!sections.length) {
    try {
      const since = new Date(Date.parse(p.time[from] ?? "") || 0);
      sections = pick(await githubReleases(p, since, opts.useCache, opts.strict));
      if (sections.length) source = "GitHub releases";
    } catch (err) {
      if (opts.strict) throw err;
      debug(`GitHub releases for ${p.name}: ${(err as Error).message}`);
    }
  }
  return { source, sections };
}

/** Scored, deduplicated entries; `usedNames` ranks the ones that mention APIs the project imports higher. */
export function changelogFromSections({ source, sections }: ChangelogSections, usedNames: Set<string>): ChangelogResult {
  // The same change is often listed in a beta and again in the final release: keep it once.
  const seen = new Set<string>();
  const items: ChangelogItem[] = [];
  for (const s of sections) {
    for (const item of extractItems(s, usedNames)) {
      const key = item.text.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 100);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...item, text: truncate(item.text, 600) });
    }
  }
  // Drop changes that were reverted later, and the revert entries themselves.
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const reverted = items
    .map((i) => i.text.match(/^revert(?:ed)?:?\s+["“']?(.+?)["”']?(?::\s*#?\d+)?$/i)?.[1])
    .filter((t): t is string => !!t)
    .map((t) => norm(t).slice(0, 60));
  const kept = items.filter((i) => {
    if (/^revert/i.test(i.text)) return false;
    const n = norm(i.text);
    return !reverted.some((r) => r.length > 10 && n.startsWith(r));
  });
  kept.sort((a, b) => b.score - a.score || semver.rcompare(a.version, b.version));
  return { source, versions: sections.map((s) => s.version), items: kept };
}

/** "rename CoreMessage to ModelMessage" → [["CoreMessage", "ModelMessage"]] */
export function renamePairs(items: ChangelogItem[]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const i of items) {
    // Names may be config paths: "rename experimental.dynamicIO to experimental.cacheComponents".
    const id = "([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*)";
    const patterns = [
      new RegExp(`\\brenam(?:e|ed|es|ing)\\s+\`?${id}\`?\\s+(?:to|→|->|into)\\s+\`?${id}\`?`, "gi"),
      new RegExp(`\\breplac(?:e|ed|es|ing)\\s+\`?${id}\`?\\s+with\\s+\`?${id}\`?`, "gi"),
      // "Deprecate `middleware` and recommend `proxy`"
      new RegExp(`\\bdeprecat(?:e|ed|es|ing)\\s+\`?${id}\`?\\s*(?:,|and|in favou?r of)\\s*(?:recommend|use|prefer|add)?\\s*\`${id}\``, "gi"),
    ];
    for (const re of patterns) {
      for (const m of i.text.matchAll(re)) if (m[1] !== m[2]) out.push([m[1], m[2]]);
    }
  }
  return out;
}
