import { join, resolve } from "node:path";
import semver from "semver";
import { analyzeDependency, usedNamesOf, type PackageReport } from "./analyze.js";
import { findGuides, guideText } from "./guides.js";
import { DEFAULT_LLM_MODEL } from "./llm.js";
import { resolveModel, type ResolvedModel } from "./models.js";
import { precomputedEnabled } from "./precomputed.js";
import { loadProject, type ProjectDep } from "./project.js";
import { chooseBaseline, getPackument, resolveRange, type Packument } from "./registry.js";
import { cleanItemText, pullRequestRefs, pullRequestText, type ChangelogItem } from "./changelog.js";
import { buildPackageNotes, projectUsage, touches, type ProjectUsage } from "./render.js";
import { TOOL_VERSION, cacheDir, debug, isoDate, mapLimit, readJson, sha256, truncate, writeJsonAtomic } from "./util.js";

/**
 * On-demand lookup in stalemap's change data. The notes block is fixed and small; an agent working on
 * a task needs the one change that matters for it, asked in its own (often outdated) words: "webpack
 * resolve alias", "middleware cookies redirect". Everything stalemap knows about a package's versions
 * after the model's baseline is indexed: type changes with their details, every release-note item
 * (not only the top-scored ones), upgrade-guide notes and the upgrade guides' own text in sections.
 * Ranking is BM25 over words and identifiers, with identifiers split (`resolveAlias` matches
 * "resolve alias"), plus a boost for what the project uses.
 */

export type DocKind = "note" | "types" | "changelog" | "guide-note" | "guide";

export interface SearchDoc {
  pkg: string;
  from: string;
  to: string;
  kind: DocKind;
  /** Where it comes from: "release notes 16.0.0", "docs/01-app/…/version-16.mdx › Turbopack". */
  source: string;
  /** A heading the text sits under (guide sections, release-note headings). Searched with extra weight. */
  title?: string;
  text: string;
  /**
   * How much the source vouches for it, before the query: a breaking-change release note over a
   * commit list's line, a removal over a type that only changed its text. 1 is neutral.
   */
  prior?: number;
}

/** Bump when the documents built from a report change. */
const DOCS_FORMAT = 4;
/** Docs built without any guide text are rebuilt after this long: the guides may have been unreachable. */
const NO_GUIDE_TTL_MS = 24 * 60 * 60 * 1000;
const SECTION_CHARS = 1400;

// ---------------------------------------------------------------------------
// Tokens

const STOP = new Set(
  "a an and are as at be but by can do does for from get got has have how i if in into is it its me my no not of on or our so than that the their them then there these this those to too use used uses using want was we what when where which while who why will with would you your after before should could need now new old".split(" "),
);

const splitCamel = (w: string) => w.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(" ");

/** Light stemming, so "redirects", "redirected" and "redirecting" meet, and "images" meets "image". */
export function stem(w: string): string {
  let s = w;
  if (s.length > 4 && s.endsWith("ies")) s = `${s.slice(0, -3)}y`;
  else if (s.length > 4 && /(?:ss|x|z|ch|sh)es$/.test(s)) s = s.slice(0, -2);
  // Not the s of "alias", "canvas", "status", "axis", "class".
  else if (s.length > 3 && s.endsWith("s") && !/(?:ss|us|is|ias|vas)$/.test(s)) s = s.slice(0, -1);
  if (s.length > 6 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length > 5 && s.endsWith("ed")) s = s.slice(0, -2);
  // "intersection" meets "intersecting", "validation" meets "validate", "migration" meets "migrated".
  else if (s.length > 6 && /(?:ct|ss)ion$/.test(s)) s = s.slice(0, -3);
  else if (s.length > 6 && s.endsWith("ation")) s = s.slice(0, -3);
  if (s.length > 4 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}

/**
 * Words and identifiers. An identifier counts whole and in parts: `experimental.turbopackPersistentCaching`
 * gives `experimental.turbopackpersistentcaching`, `experimental`, `turbopack`, `persistent`, `cach`.
 */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[@A-Za-z_$][\w$]*(?:[./-][A-Za-z_$][\w$]*)*/g)) {
    const raw = m[0];
    // `_id`, `_v`: a leading underscore is part of the name. Splitting it would make `_id` match every `id`.
    if (/^_[A-Za-z]+$/.test(raw)) {
      out.push(raw.toLowerCase());
      continue;
    }
    const parts = raw
      .split(/[./\-_$@]+/)
      .flatMap(splitCamel)
      .map((p) => p.toLowerCase())
      .filter((p) => p.length >= 2 && !STOP.has(p));
    const whole = raw.toLowerCase().replace(/^[@_$]+/, "");
    if ((parts.length !== 1 || parts[0] !== whole) && whole.length >= 3 && !STOP.has(whole)) out.push(whole);
    for (const p of parts) out.push(stem(p));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Documents

/** A markdown guide in sections, each under its heading path, long ones cut at paragraph breaks. */
export function guideSections(markdown: string, path: string): Array<{ title: string; text: string }> {
  const body = markdown
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/^(?:import|export) .*$/gm, "")
    .replace(/<\/?[A-Z][^>]*>/g, "")
    .replace(/\n[ \t]*(?:\n[ \t]*)+\n/g, "\n\n");
  const out: Array<{ title: string; text: string }> = [];
  const trail: string[] = [];
  let buf: string[] = [];
  let inFence = false;
  const flush = () => {
    const text = buf.join("\n").trim();
    buf = [];
    if (text.length < 40) return;
    const title = trail.filter(Boolean).join(" › ") || path.split("/").pop()!;
    if (text.length <= SECTION_CHARS) return void out.push({ title, text });
    let chunk = "";
    for (const para of text.split(/\n{2,}/)) {
      if (chunk && chunk.length + para.length > SECTION_CHARS) {
        out.push({ title, text: chunk.trim() });
        chunk = "";
      }
      chunk += `${para}\n\n`;
    }
    if (chunk.trim()) out.push({ title, text: truncate(chunk.trim(), SECTION_CHARS * 2) });
  };
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      trail.length = h[1].length - 1;
      trail[h[1].length - 1] = h[2].replace(/[`*_]/g, "").replace(/\s*\{#[^}]*\}\s*$/, "").trim();
      continue;
    }
    buf.push(line);
  }
  flush();
  return out;
}

/** The searchable documents of one report: notes, type changes, moved keys, release notes, guide notes. */
export function reportDocs(r: PackageReport): SearchDoc[] {
  if (r.status !== "changed" || !r.baseline || !r.pinned) return [];
  const base = { pkg: r.name, from: r.baseline.version, to: r.pinned };
  const docs: SearchDoc[] = [];
  const seen = new Set<string>();
  const push = (d: SearchDoc) => {
    const key = d.text.replace(/\W+/g, " ").trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    docs.push(d);
  };
  // The notes as the block words them (option successors, moved keys, merged removals)…
  for (const b of buildPackageNotes(r, 8).bullets) {
    const kind: DocKind = b.tag === "guide" ? "guide-note" : b.tag === "changelog" ? "changelog" : "note";
    push({ ...base, kind, source: b.tag === "guide" ? "upgrade guide" : b.tag === "changelog" ? "release notes" : "type declarations", text: b.text, prior: b.priority >= 85 ? 1.15 : 1 });
  }
  // …and every type change, which the block cuts to what the project imports.
  for (const c of r.types?.changes ?? []) {
    if (c.kind === "added") continue;
    const entry = c.subpath === "." ? r.name : `${r.name}/${c.subpath.slice(2)}`;
    for (const [key, successor] of Object.entries(c.meta?.movedKeys ?? {})) {
      push({ ...base, kind: "types", source: `type declarations (${entry})`, text: `\`${c.symbol.split(".")[0]}\` key \`${key}\` moved: ${successor}.` });
    }
    const extra = [
      c.meta?.addedOptions?.length ? `New options: ${c.meta.addedOptions.map((o) => `\`${o}\`${c.meta?.optionDocs?.[o] ? ` (${c.meta.optionDocs[o]})` : ""}`).join(", ")}.` : "",
      c.meta?.members?.length && !c.meta.movedKeys ? `Members: ${c.meta.members.map((m) => `\`${m}\``).join(", ")}.` : "",
    ].filter(Boolean);
    // A type that only changed its text says little; a removal or a new requirement says a lot.
    const prior = c.severity >= 6 ? 1.1 : c.severity >= 4 ? 0.9 : 0.6;
    push({ ...base, kind: "types", source: `type declarations (${entry})`, text: [c.detail.endsWith(".") ? c.detail : `${c.detail}.`, ...extra].join(" "), prior });
  }
  // Additions, grouped: new names the model has never seen (`cacheLife`, `proxy`).
  const added = new Map<string, string[]>();
  for (const c of r.types?.changes ?? []) if (c.kind === "added") added.set(c.subpath, [...(added.get(c.subpath) ?? []), c.symbol]);
  for (const [sub, names] of added) {
    const entry = sub === "." ? r.name : `${r.name}/${sub.slice(2)}`;
    for (let i = 0; i < names.length; i += 25) {
      push({ ...base, kind: "types", source: `type declarations (${entry})`, text: `New exports in \`${entry}\` ${r.pinned}: ${names.slice(i, i + 25).map((n) => `\`${n}\``).join(", ")}.`, prior: 0.8 });
    }
  }
  for (const g of releaseNoteGroups(r.changelog?.items ?? [])) {
    // The changelog reader's score: breaking-change wording and code names up, chores down.
    const score = Math.max(...g.map((i) => i.score));
    const prior = score >= 6 ? 1.15 : score >= 2 ? 1 : score >= 0 ? 0.85 : 0.7;
    const text = g.length > 1 ? truncate(g.map((i) => searchText(i)).join("\n\n"), SECTION_CHARS) : truncate(searchText(g[0]), 900);
    push({ ...base, kind: "changelog", source: `release notes ${g[0].version}`, title: g[0].heading, text, prior });
  }
  for (const n of r.guideNotes ?? []) {
    push({ ...base, kind: "guide-note", source: `upgrade guide (${n.source})`, text: `${n.text}${n.quote ? ` Guide: “${truncate(n.quote, 160)}”` : ""}` });
  }
  return docs;
}

/**
 * A release-note item as search shows it: its cleaned prose with its code blocks kept. The fix is often
 * the code ("To accept both forms, union the two precisions:" and then the code).
 */
function searchText(i: ChangelogItem): string {
  if (!i.raw || !/```|~~~/.test(i.raw)) return i.text;
  const parts = i.raw.split(/^\s*(```[^\n]*|~~~[^\n]*)$/m);
  const out: string[] = [];
  let code = false;
  for (const part of parts) {
    if (/^(```|~~~)/.test(part)) {
      code = !code;
      continue;
    }
    if (code) {
      const lines = part.replace(/^\n+|\s+$/g, "").split("\n");
      if (lines.length && lines.some((l) => l.trim())) out.push(["```", ...lines.slice(0, 24), ...(lines.length > 24 ? ["…"] : []), "```"].join("\n"));
    } else {
      const prose = cleanItemText(part);
      if (prose) out.push(prose);
    }
  }
  return out.join("\n") || i.text;
}

/**
 * Release-note items as search documents. The paragraphs under a heading that is itself the change
 * ("### `z.iso.datetime()` no longer accepts minute precision") are one section: the heading, what
 * changed and the remedy belong together. Bullets under a generic heading ("Breaking changes") are
 * separate changes and stay separate.
 */
function releaseNoteGroups(items: ChangelogItem[]): ChangelogItem[][] {
  const sectionKey = (i: ChangelogItem) => `${i.version}\0${i.heading ?? ""}`;
  const described = new Set(items.filter((i) => i.heading && i.raw === i.heading).map(sectionKey));
  const groups = new Map<string, ChangelogItem[]>();
  const out: ChangelogItem[][] = [];
  for (const i of items) {
    const key = sectionKey(i);
    if (!described.has(key) || i.seq === undefined) {
      out.push([i]);
      continue;
    }
    if (!groups.has(key)) {
      const g: ChangelogItem[] = [];
      groups.set(key, g);
      out.push(g);
    }
    groups.get(key)!.push(i);
  }
  for (const g of groups.values()) g.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  return out;
}

/** Pull requests read per package: the release-note items most likely to need their description. */
const MAX_PULL_REQUESTS = Number(process.env.STALEMAP_MAX_PRS) || 12;

/**
 * The descriptions of the pull requests behind release-note items that say little themselves: a bare
 * title ("Return client errors for unrecognized Server Actions"), or a pointer ("see the PR for
 * documented compatibility effects"). A pointer counts in any section; a bare title only if it reads
 * like a change (breaking or behavior wording, a score of 2 or more).
 */
async function pullRequestDocs(p: Packument, r: PackageReport, useCache: boolean): Promise<SearchDoc[]> {
  if (process.env.STALEMAP_NO_PRS === "1" || !r.baseline || !r.pinned) return [];
  // An item that sends the reader to its pull request counts whatever its section ("Security fixes").
  const pointer = (i: ChangelogItem) => /\bsee (?:the )?(?:pr|pull request)s?\b|(?:compatibility|migration) (?:effects|notes|details)\b/i.test(i.text);
  const wanted = (r.changelog?.items ?? [])
    .filter((i) => (pointer(i) ? i.score > -3 : i.score >= 2 && i.text.length < 140) && pullRequestRefs(i.raw).length)
    .sort((a, b) => Number(pointer(b)) - Number(pointer(a)) || b.score - a.score)
    .slice(0, MAX_PULL_REQUESTS);
  const docs: SearchDoc[] = [];
  const seen = new Set<number>();
  await mapLimit(wanted, 4, async (i) => {
    for (const n of pullRequestRefs(i.raw).slice(0, 2)) {
      if (seen.has(n)) continue;
      seen.add(n);
      const pr = await pullRequestText(p, n, useCache).catch(() => undefined);
      const body = pr?.body ? searchText({ ...i, raw: stripTemplate(pr.body), text: cleanItemText(stripTemplate(pr.body)) }) : "";
      if (body.length < 80) continue;
      docs.push({ pkg: r.name, from: r.baseline!.version, to: r.pinned!, kind: "changelog", source: `release notes ${i.version}`, title: `#${n} ${pr!.title}`, text: truncate(`${i.text}\n${body}`, SECTION_CHARS), prior: 0.95 });
    }
  });
  return docs;
}

/** A pull request's description without its template: checklists, HTML comments, "Fixes #123" lines. */
function stripTemplate(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^\s*[-*] \[[ xX]\].*$/gm, "")
    .replace(/^#+\s*(?:checklist|testing|test plan|screenshots?|related issues?)\b[\s\S]*?(?=^#+\s|$(?![\s\S]))/gim, "")
    .replace(/^\s*(?:fixes|closes|resolves)\s+#\d+.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface CachedDocs {
  at: number;
  format: number;
  docs: SearchDoc[];
  guides: number;
}

/**
 * Everything searchable about `dep` between the model's baseline and the pinned version, cached on
 * disk per version pair: after the first build, searching needs no network.
 */
export async function packageDocs(dep: ProjectDep, model: ResolvedModel, opts: { useCache: boolean; marginDays: number }): Promise<SearchDoc[]> {
  let pinned = dep.pinned;
  let from: string | undefined;
  try {
    const p = await getPackument(dep.name, opts.useCache);
    pinned ??= resolveRange(p, dep.range);
    from = chooseBaseline(p, model.cutoff, opts.marginDays)?.version;
    if (!pinned || !from || !semver.valid(pinned) || semver.lte(pinned, from)) return [];
    const path = join(cacheDir(), "search", `${sha256(JSON.stringify([TOOL_VERSION, DOCS_FORMAT, dep.name, from, pinned])).slice(0, 24)}.json`);
    const hit = await readJson<CachedDocs>(path);
    if (opts.useCache && hit?.format === DOCS_FORMAT && (hit.guides > 0 || Date.now() - hit.at < NO_GUIDE_TTL_MS)) return hit.docs;

    // Every public entry point, not only the imported ones: the agent may be about to import another.
    const r = await analyzeDependency(
      { name: dep.name, range: dep.range, kind: dep.kind, pinned },
      {
        model,
        marginDays: opts.marginDays,
        useCache: opts.useCache,
        llm: false,
        llmModel: "",
        maxNotesPerPackage: 8,
        concurrency: 1,
        allSubpaths: true,
        precomputed: precomputedEnabled(),
        // Upgrade-guide notes `sync --guides` made, from the cache: no model calls here.
        guides: { model: process.env.STALEMAP_LLM_MODEL ?? DEFAULT_LLM_MODEL },
      },
    );
    if (r.status !== "changed") return [];
    const docs = reportDocs(r);
    docs.push(...(await pullRequestDocs(p, r, opts.useCache)));
    let guides = 0;
    try {
      // A guide's text is about a major: within one (react 19.1 → 19.3) it's the previous major's
      // upgrade, which the model already knows. (Guide notes made with `--guides` stay: they were
      // written for this version range.)
      const crossesMajor = semver.major(pinned) > semver.major(from);
      for (const g of crossesMajor ? await findGuides(p, from, pinned, opts.useCache) : []) {
        const text = await guideText(g, opts.useCache);
        if (!text) continue;
        guides++;
        for (const s of guideSections(text, g.path)) docs.push({ pkg: dep.name, from, to: pinned, kind: "guide", source: `upgrade guide ${g.path}`, title: s.title, text: s.text });
      }
    } catch (err) {
      debug(`search: guides for ${dep.name}: ${(err as Error).message}`);
    }
    await writeJsonAtomic(path, { at: Date.now(), format: DOCS_FORMAT, docs, guides } satisfies CachedDocs);
    return docs;
  } catch (err) {
    debug(`search: ${dep.name}: ${(err as Error).message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Index

export interface SearchIndex {
  docs: SearchDoc[];
  tf: Array<Map<string, number>>;
  lengths: number[];
  df: Map<string, number>;
  avgLength: number;
}

export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const tf: Array<Map<string, number>> = [];
  const lengths: number[] = [];
  const df = new Map<string, number>();
  for (const d of docs) {
    const counts = new Map<string, number>();
    const toks = [...tokenize(`${d.text} ${d.pkg}`), ...tokenize(d.title ?? ""), ...tokenize(d.title ?? "")];
    for (const t of toks) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    tf.push(counts);
    lengths.push(toks.length);
  }
  const avgLength = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
  return { docs, tf, lengths, df, avgLength };
}

/** Results per search when the agent doesn't ask for a number. */
export const DEFAULT_LIMIT = 8;
const KIND_WEIGHT: Record<DocKind, number> = { note: 1.15, types: 1.1, "guide-note": 1.15, changelog: 1, guide: 1 };

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  snippet: string;
}

/**
 * BM25 (k1 1.2, b 0.75), weighted by kind and by what the project uses (`usage`, per package), with a
 * nudge for packages the query names. At most two hits from one guide section or release.
 */
export function searchIndex(
  index: SearchIndex,
  query: string,
  opts: { usage?: Map<string, ProjectUsage>; pkg?: string; limit?: number; focus?: Set<string> } = {},
): SearchHit[] {
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const n = index.docs.length;
  const idf = (t: string) => {
    const df = index.df.get(t) ?? 0;
    return df ? Math.log(1 + (n - df + 0.5) / (df + 0.5)) : 0;
  };
  const named = new Set(index.docs.map((d) => d.pkg).filter((p) => new RegExp(`(?<![\\w@/-])${p.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![\\w/-])`, "i").test(query)));
  const scored: Array<{ i: number; score: number }> = [];
  for (let i = 0; i < n; i++) {
    const d = index.docs[i];
    if (opts.pkg && d.pkg !== opts.pkg) continue;
    const tf = index.tf[i];
    let s = 0;
    let matched = 0;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      matched++;
      s += idf(t) * ((f * 2.2) / (f + 1.2 * (0.25 + (0.75 * index.lengths[i]) / index.avgLength)));
    }
    if (!s) continue;
    // Matching more of the query's terms beats repeating one of them.
    s *= 0.6 + (0.4 * matched) / q.length;
    s *= KIND_WEIGHT[d.kind] * (d.prior ?? 1);
    // Packages used by the files the query names (`app/components/ProductPhoto.tsx`).
    if (opts.focus?.has(d.pkg)) s *= 1.4;
    const usage = opts.usage?.get(d.pkg);
    if (usage) {
      const t = touches(d.text, usage);
      s *= 1 + 0.2 * Math.min(2, t.strong) + 0.08 * Math.min(1, t.weak);
    }
    if (named.has(d.pkg)) s *= 1.25;
    scored.push({ i, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  const out: SearchHit[] = [];
  const perGroup = new Map<string, number>();
  for (const { i, score } of scored) {
    const d = index.docs[i];
    // At most two hits from one guide section or one release-note section (two from the same release
    // under different headings are different changes).
    const group = `${d.pkg}|${d.source}|${d.kind === "guide" || d.kind === "changelog" ? (d.title ?? d.text.slice(0, 80)) : ""}`;
    if ((perGroup.get(group) ?? 0) >= 2) continue;
    perGroup.set(group, (perGroup.get(group) ?? 0) + 1);
    out.push({ doc: d, score, snippet: snippet(d.text, q) });
    if (out.length >= (opts.limit ?? DEFAULT_LIMIT)) break;
  }
  return out;
}

/** The part of a long text with the most query terms: a few lines around the best one. */
export function snippet(text: string, queryTokens: string[], max = 900): string {
  if (text.length <= max) return text;
  const lines = text.split(/\n/);
  const want = new Set(queryTokens);
  const scoreOf = (l: string) => new Set(tokenize(l).filter((t) => want.has(t))).size;
  let best = 0;
  let bestScore = -1;
  lines.forEach((l, i) => {
    const s = scoreOf(l) + (lines[i + 1] ? scoreOf(lines[i + 1]) / 2 : 0);
    if (s > bestScore) [best, bestScore] = [i, s];
  });
  let start = best;
  let end = best + 1;
  let len = lines[best].length;
  while (len < max && (start > 0 || end < lines.length)) {
    if (end < lines.length && (len + lines[end].length < max || start === 0)) len += lines[end++].length + 1;
    else if (start > 0) len += lines[--start].length + 1;
    else break;
  }
  return `${start > 0 ? "…\n" : ""}${truncate(lines.slice(start, end).join("\n"), max)}${end < lines.length ? "\n…" : ""}`;
}

// ---------------------------------------------------------------------------
// A project's index, kept for the life of the process

interface ProjectIndex {
  model: ResolvedModel;
  index: SearchIndex;
  usage: Map<string, ProjectUsage>;
  packages: Array<{ name: string; from: string; to: string }>;
  /** Project-relative files that import or configure each package. */
  files: Map<string, Set<string>>;
}

/** Packages used by files the query names: "in `src/models/user.ts`, …" is about what that file imports. */
export function focusPackages(query: string, files: Map<string, Set<string>>): Set<string> {
  const named = [...query.matchAll(/(?:\.{0,2}\/)?[\w@.-]+(?:\/[\w@.[\]-]+)*\.[cm]?[jt]sx?\b|[\w.-]+\.(?:json|prisma)\b/g)].map((m) => m[0].replace(/^\.\//, ""));
  const out = new Set<string>();
  if (!named.length) return out;
  for (const [pkg, fs] of files) for (const f of fs) if (named.some((n) => f === n || f.endsWith(`/${n}`))) out.add(pkg);
  return out;
}

const projects = new Map<string, Promise<ProjectIndex>>();

async function projectIndex(cwd: string, opts: { model?: string; cutoff?: string; useCache?: boolean; marginDays?: number; extra?: string }): Promise<ProjectIndex> {
  const root = resolve(cwd);
  const project = await loadProject(root);
  const model = await resolveModel({ model: opts.model, cutoff: opts.cutoff, cwd: root, useCache: opts.useCache ?? true });
  // Every direct dependency: a task may be about one the code doesn't import yet.
  const deps = [...project.deps];
  if (opts.extra && !deps.some((d) => d.name === opts.extra)) deps.push({ name: opts.extra, range: "latest", kind: "dependencies" });
  const key = JSON.stringify([root, model.id, isoDate(model.cutoff), opts.marginDays ?? 30, deps.map((d) => `${d.name}@${d.pinned ?? d.range}`)]);
  let built = projects.get(key);
  if (!built) {
    built = (async () => {
      const lists = await mapLimit(deps, 4, (d) => packageDocs(d, model, { useCache: opts.useCache ?? true, marginDays: opts.marginDays ?? 30 }));
      const docs = lists.flat();
      const usage = new Map<string, ProjectUsage>();
      for (const d of deps) {
        if (!d.usage) continue;
        const files = [...d.usage.files].slice(0, 12);
        const entries = [...d.usage.subpaths.keys()].filter((s) => s !== ".").map((s) => `${d.name}/${s.slice(2)}`);
        usage.set(d.name, projectUsage({ name: d.name, used: true, usedNames: usedNamesOf(d), files, entries } as PackageReport));
      }
      const packages = [...new Map(docs.map((d) => [d.pkg, { name: d.pkg, from: d.from, to: d.to }])).values()];
      const files = new Map(deps.filter((d) => d.usage).map((d) => [d.name, d.usage!.files] as const));
      return { model, index: buildIndex(docs), usage, packages, files };
    })();
    built.catch(() => projects.delete(key));
    projects.set(key, built);
  }
  return built;
}

export interface SearchResult {
  text: string;
  hits: SearchHit[];
  packages: Array<{ name: string; from: string; to: string }>;
}

/** `search_changes`: the changes in the project's dependencies that best match `query`, as text for the agent. */
export async function searchChanges(opts: { cwd: string; query: string; package?: string; limit?: number; model?: string; cutoff?: string; useCache?: boolean }): Promise<SearchResult> {
  const p = await projectIndex(opts.cwd, { model: opts.model, cutoff: opts.cutoff, useCache: opts.useCache, extra: opts.package });
  const limit = Math.min(15, Math.max(1, opts.limit ?? DEFAULT_LIMIT));
  const known = p.packages.map((x) => `\`${x.name}\` ${x.from} → ${x.to}`).join(", ");
  const cutoff = isoDate(p.model.cutoff);
  if (opts.package && !p.packages.some((x) => x.name === opts.package)) {
    const text = `\`${opts.package}\`: no changes after \`${p.model.id}\`'s training data (cutoff ${cutoff}) in the version this project uses, or it isn't one of its dependencies. Packages that did change: ${known || "none"}.`;
    return { text, hits: [], packages: p.packages };
  }
  const hits = searchIndex(p.index, opts.query, { usage: p.usage, pkg: opts.package, limit, focus: focusPackages(opts.query, p.files) });
  if (!hits.length) {
    const text = `No change matches "${opts.query}"${opts.package ? ` in \`${opts.package}\`` : ""}. Packages that changed after \`${p.model.id}\`'s training data (cutoff ${cutoff}): ${known || "none"}. Try other words for the API or option, or the error message.`;
    return { text, hits, packages: p.packages };
  }
  const lines = [
    `Changes after \`${p.model.id}\`'s training data (cutoff ${cutoff}) in this project's dependencies that match "${opts.query}". They describe the installed versions: where they disagree with what you remember, they are right.`,
    "",
  ];
  hits.forEach((h, i) => {
    const d = h.doc;
    const range = d.kind === "changelog" ? `${d.pkg} ${d.source.replace(/^release notes /, "")}` : `${d.pkg} ${d.from} → ${d.to}`;
    const where = d.kind === "changelog" ? "release notes" : d.source;
    const title = d.title && d.kind === "guide" ? ` § ${d.title}` : d.title && d.kind === "changelog" ? ` (${truncate(d.title, 60)})` : "";
    lines.push(`${i + 1}. ${range} · ${where}${title}`, h.snippet.split("\n").map((l) => `   ${l}`).join("\n"), "");
  });
  return { text: lines.join("\n").trimEnd(), hits, packages: p.packages };
}
