import type { PackageReport } from "./analyze.js";
import { classifyChangelogItem, codeKeys, compileVisible, CONFIG_TYPE, echoesHeading, guardInvisible, isListLabel, matchStrength, namespaceHeads } from "./changes.js";
import { GENERIC_HEADING, renamePairs } from "./changelog.js";
import { configuredBy } from "./configusage.js";
import type { ResolvedModel } from "./models.js";
import { compilerOptionsNote, deprecatedCompilerOptions, OPTION_ENUMS } from "./tsoptions.js";
import type { GuideNote } from "./guides.js";
import type { TypeChange } from "./typediff.js";
import { estimateTokens, isoDate, truncate } from "./util.js";

export type Tag = "types" | "changelog" | "summary" | "guide";

export interface Bullet {
  text: string;
  tag: Tag;
  priority: number;
  /** A probe showed the model gets this wrong without the note. */
  measured?: boolean;
  /** For removals with a known successor: [old, new], merged into one line per package. */
  swap?: [string, string];
  /** A before/after pair compiled against the pinned version. */
  example?: { before: string; after: string };
}

/** Probe verdicts keyed `package|subpath|symbol|kind` (see probe/run.ts). */
export type Measurements = Map<string, "stale" | "current" | "avoided" | "no-code">;

export interface PackageNotes {
  report: PackageReport;
  bullets: Bullet[];
}

const sentence = (s: string) => (/[.!?)`…]$/.test(s) ? s : s + ".");

function whereLabel(name: string, c: TypeChange): string {
  return c.subpath === "." ? "" : ` (in \`${name}/${c.subpath.slice(2)}\`)`;
}

/** Changes worth telling the agent about even without a summary pass. */
function isActionableTypeChange(c: TypeChange): boolean {
  if (!c.used) return false;
  if (c.kind === "removed" || c.kind === "renamed" || c.kind === "subpath" || c.kind === "deprecated") return true;
  return c.severity >= 6;
}

function backticked(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/`([^`]+)`/g)) out.add(m[1].replace(/\(\)$/, "").split(".").pop()!);
  return out;
}

export interface NotesOptions {
  /**
   * The post-edit guard is on. It reports compile errors, so removed and renamed APIs get caught when
   * the agent uses them; the notes go first to what still type-checks (see changes.ts).
   */
  guard?: boolean;
}

/** How far a change the compiler will report drops when the guard is on. */
const GUARD_PENALTY = 20;

/**
 * What the project uses of a package, so each project gets the notes about its own code: imported
 * names and the members and props it uses, config keys it sets (nested ones dotted), the files that
 * use the package and the entry points it imports.
 */
export interface ProjectUsage {
  names: Set<string>;
  entries: Set<string>;
  /** Used only through its config files (TypeScript through tsconfig.json): its JS API doesn't matter here. */
  configOnly: boolean;
  /** Objects whose keys are unrelated features (`experimental`): naming one isn't naming another (changes.ts). */
  namespaces: Set<string>;
}

export function projectUsage(r: PackageReport): ProjectUsage {
  const names = new Set<string>();
  for (const n of r.usedNames) {
    names.add(n);
    for (const part of n.split(".")) names.add(part);
  }
  for (const f of r.files) {
    const base = f.split("/").pop()!;
    names.add(base);
    names.add(base.replace(/\.[^.]+$/, ""));
  }
  const configOnly = r.used && r.files.length > 0 && !r.entries?.length && r.files.every((f) => configuredBy(f, [r.name]).includes(r.name));
  return { names, entries: new Set(r.entries ?? []), configOnly, namespaces: namespaceHeads(r) };
}

/** How much of a note's code names the project uses: names it outright (strong), or only their object (weak). */
export function touches(text: string, usage: ProjectUsage, namespaces?: Set<string>): { strong: number; weak: number } {
  let strong = 0;
  let weak = 0;
  const seen = new Set<string>();
  for (const k of codeKeys(text)) {
    const leaf = k.split(/[./]/).pop()!;
    if (seen.has(leaf)) continue;
    seen.add(leaf);
    const m = k.includes("/") ? (usage.entries.has(k) ? 2 : 0) : matchStrength(k, usage.names, namespaces ?? usage.namespaces);
    if (m === 2) strong++;
    else if (m === 1) weak++;
  }
  return { strong, weak };
}

/** Priority added for touching the project's code. */
const touchBoost = (t: { strong: number; weak: number }) => 10 * Math.min(2, t.strong) + 3 * Math.min(1, t.weak);

/** A change to the options a config file sets (`CompilerOptions`, `NextConfig` members, option values), not to the JS API. */
function isConfigChange(c: TypeChange): boolean {
  const owner = c.symbol.split(".")[0];
  if (OPTION_ENUMS[owner]) return c.kind === "deprecated" || c.kind === "members";
  if (!CONFIG_TYPE.test(owner)) return false;
  return c.kind === "members" || c.kind === "deprecated" || c.symbol.includes(".");
}

/** Below every note about the project's config, for a package used only through its config. */
const JS_API_PENALTY = 40;

/**
 * "`CompilerOptions` options removed: `baseUrl` (this project sets it); also `outFile`, …": the
 * options the project's config sets first and all of them, the rest capped.
 */
function configMembersText(owner: string, removed: string[], usage: ProjectUsage): string {
  const mine = removed.filter((m) => usage.names.has(m));
  const rest = removed.filter((m) => !usage.names.has(m));
  const code = (m: string) => `\`${m}\``;
  const own = mine.length ? `${mine.map(code).join(", ")} (this project sets ${mine.length > 1 ? "them" : "it"})` : "";
  const others = rest.length ? `${own ? "; also " : ""}${listCapped(rest.map(code), 8)}` : "";
  return `${code(owner)} options removed: ${own}${others}.`;
}

export function buildPackageNotes(r: PackageReport, maxChangelogItems: number, measured?: Measurements, opts: NotesOptions = {}): PackageNotes {
  const bullets: Bullet[] = [];
  const changes = r.types?.changes ?? [];
  const usage = projectUsage(r);

  const summarized = new Set<string>();
  for (const n of r.llmNotes ?? []) {
    bullets.push({ text: sentence(n.text), tag: "summary", priority: n.affects_used_api ? 96 : 88 });
    for (const id of backticked(n.text)) summarized.add(id);
  }

  // TypeScript's deprecated compiler options, as one note, when the project has a tsconfig.json.
  const optionSymbols = r.tsconfig ? deprecatedCompilerOptions(r).symbols : new Set<string>();
  const optionsNote = r.tsconfig ? compilerOptionsNote(r, r.tsconfig) : undefined;
  if (optionsNote) bullets.push({ text: optionsNote.text, tag: "types", priority: optionsNote.setsDeprecated.length ? 97 : 89 });

  // Type-level facts about APIs this project imports. For a dependency the code doesn't import yet
  // (a new project, or --all), there's no usage to go by: keep breaking changes to APIs the changelog
  // talks about, which filters out internal exports that merely disappeared.
  const items = r.changelog?.items ?? [];
  const word = (name: string) => new RegExp(`(?<![\\w$])${name.replace(/\$/g, "\\$")}(?![\\w$])`);
  const REMOVAL = /\b(remov|renam|replac|deprecat|instead|in favou?r of|no longer|drop)/i;
  const mentioned = (name: string | undefined, withRemoval: boolean) =>
    !!name && name !== "default" && items.some((i) => word(name).test(i.text) && (!withRemoval || REMOVAL.test(i.text)));
  /** 0 = skip. Higher = more likely to matter for code that doesn't exist yet. */
  const unusedScore = (c: TypeChange): number => {
    if (r.used) return 0;
    const head = c.symbol.split(".")[0];
    if (head.startsWith("_")) return 0; // internal by convention
    // Version mirrors and internals (`zod/v4`, `zod/v4-mini`, `x/core`) rank below the package root.
    const mirror = /(^|\/)(v\d+[\w-]*|mini|core|internal|compat|legacy|classic)(\/|$)/.test(c.subpath.slice(2));
    const score = baseUnusedScore(c, head);
    return mirror ? Math.max(0, score - 2) : score;
  };
  const baseUnusedScore = (c: TypeChange, head: string): number => {
    if (c.kind === "renamed") return mentioned(head, false) ? 3 : 0;
    if (c.kind === "params" && c.severity >= 8) {
      if ((c.meta?.removedOptions ?? []).some((o) => mentioned(o, false))) return 3;
      // A dropped positional parameter (`any(params)`) is weak evidence on its own.
      if (!c.meta?.removedOptions?.length && !c.meta?.requiredOptions?.length && !c.meta?.requiredParams?.length) return mentioned(head, false) ? 1 : 0;
      return mentioned(head, false) ? 2 : 0;
    }
    if (c.kind === "removed") {
      // A removal with a known successor is as useful as a rename.
      const successor =
        pairs.some(([from, to]) => head.includes(from) && addedBySubpath.get(c.subpath)?.has(head.replace(from, to))) ||
        !!versionedSuccessor(head, addedBySubpath.get(c.subpath));
      if (successor || /\buse\b.+\binstead\b/i.test(c.detail)) return 3;
      return mentioned(head, true) ? 2 : 0;
    }
    // Config keys that moved still type-check in their old place, so nothing else will catch them.
    if (c.kind === "deprecated" && c.meta?.movedKeys) return 3;
    if (c.kind === "deprecated" && !c.symbol.includes(".") && !c.meta?.members) {
      // A deprecation that names its replacement is useful even if the changelog never mentions it.
      if (/\b(use|instead|renamed|replaced|merged into)\b/i.test(c.detail)) return 2;
      return mentioned(head, false) ? 1 : 0;
    }
    return 0;
  };
  const usedChangelog = new Set<string>();
  const pairs = renamePairs(r.changelog?.items ?? []);
  const addedBySubpath = new Map<string, Set<string>>();
  for (const c of changes) if (c.kind === "added") addedBySubpath.set(c.subpath, (addedBySubpath.get(c.subpath) ?? new Set()).add(c.symbol));
  const typeBullets = changes.filter((x) => isActionableTypeChange(x) || unusedScore(x) > 0).length;
  const scored = changes.map((c) => ({ c, u: unusedScore(c) })).filter(({ c, u }) => isActionableTypeChange(c) || u > 0);
  scored.sort((a, b) => Number(b.c.used) - Number(a.c.used) || b.u - a.u || b.c.severity - a.c.severity || Number(a.c.subpath !== ".") - Number(b.c.subpath !== "."));
  // Packages re-export the same API from several entry points (`zod`, `zod/v4`, `zod/v4-mini`): report it once.
  const seenChange = new Set<string>();
  for (const { c, u } of scored) {
    const changeKey = `${c.kind}|${c.symbol}|${c.detail.replace(/ \(in `[^`]+`\)$/, "")}`;
    if (seenChange.has(changeKey) || seenChange.has(`${c.kind}|${c.symbol}`)) continue;
    seenChange.add(changeKey).add(`${c.kind}|${c.symbol}`);
    if (optionsNote && optionSymbols.has(c.symbol)) continue;
    const sym = c.symbol.split(".").pop()!;
    if (summarized.has(sym) || summarized.has(c.symbol)) continue;
    // A probe showed the model already writes this correctly: the note would only cost tokens.
    const verdict = measured?.get(`${r.name}|${c.subpath}|${c.symbol}|${c.kind}`);
    if (verdict === "current") continue;
    // With the guard on, removals it reports and deprecations (which still work) wait behind the rest.
    // Config keys that moved are the exception: a config object type-checks with the old key.
    const configMove = c.kind === "deprecated" && !!c.meta?.movedKeys && CONFIG_TYPE.test(c.symbol.split(".")[0]);
    const configChange = isConfigChange(c);
    // A config file isn't type-checked as code: a removed option there is the guard's only if `tsc` says so.
    const penalty =
      (opts.guard && (compileVisible(c) || (c.kind === "deprecated" && !configMove)) && !(usage.configOnly && configChange) ? GUARD_PENALTY : 0) +
      (usage.configOnly && !configChange ? JS_API_PENALTY : 0);
    const base = (c.used ? 90 + c.severity : 84 + 2 * u + c.severity / 3) - penalty;
    const boost = verdict === "stale" ? { measured: true as const, priority: 100 + c.severity - penalty } : { priority: base };
    let text = sentence(`${c.detail}${whereLabel(r.name, c)}`);
    if (c.meta?.movedKeys) text = movedKeysText(c.symbol.split(".")[0], c.meta.movedKeys, pairs, items, usage) + whereLabel(r.name, c);
    else if (c.kind === "members" && CONFIG_TYPE.test(c.symbol) && c.meta?.members?.length && / removed /.test(c.detail)) {
      text = configMembersText(c.symbol, c.meta.members, usage) + whereLabel(r.name, c);
    }
    // Infer the replacement from a rename the changelog announces elsewhere: CoreMessage → ModelMessage
    // makes convertToCoreMessages → convertToModelMessages, if the new name exists.
    if (c.kind === "removed") {
      const replacement =
        pairs.map(([from, to]) => (sym.includes(from) ? sym.replace(from, to) : undefined)).find((cand) => cand && addedBySubpath.get(c.subpath)?.has(cand)) ??
        versionedSuccessor(sym, addedBySubpath.get(c.subpath));
      const hinted = replacement ?? c.detail.match(/\bUse `([^`]+)` instead\b/i)?.[1];
      if (hinted) {
        // Successors inferred from an announced rename are the surest; list them first.
        const lift = replacement ? 0.5 : 0;
        bullets.push({ text: `\`${sym}\` was removed; use \`${hinted}\`${whereLabel(r.name, c)}.`, tag: "types", swap: [sym, hinted], ...boost, priority: boost.priority + lift });
        continue;
      }
    }
    // Removed options usually have a successor among the new ones: say which, so the agent
    // doesn't fall back to the old name (`parameters` → `inputSchema`, `maxTokens` → `maxOutputTokens`).
    if (c.kind === "params" && c.meta?.removedOptions?.length && c.meta.addedOptions?.length) {
      const coMentioned = (a: string, removed: string[]) => items.some((i) => word(a).test(i.text) && removed.some((o) => word(o).test(i.text)));
      text = text.replace(/\.$/, "") + optionHints(c.meta.removedOptions, c.meta.addedOptions, pairs, coMentioned, c.meta.optionDocs) + ".";
    }
    // A removed API's replacement is usually in the changelog entry that mentions it.
    if (c.kind === "removed" && !r.llmNotes?.length) {
      const word = new RegExp(`(?<![\\w$])${sym.replace(/\$/g, "\\$")}(?![\\w$])`);
      const mentions = (r.changelog?.items ?? []).filter((i) => word.test(i.text) && !usedChangelog.has(i.text));
      const mention =
        mentions.find((i) => /\b(renamed?|replaced?|instead|in favou?r of|migrat|removed?)\b|→|->/i.test(i.text)) ?? mentions[0];
      if (mention) {
        usedChangelog.add(mention.text);
        text += ` Changelog: “${truncate(mention.text, 180)}”`;
      }
    }
    bullets.push({ text, tag: "types", ...boost });
  }

  // The upgrade guide covers what types can't show: defaults, config moves, file conventions. Notes
  // that name something the project uses (an import, a config key, a file) come first.
  // A changed default doesn't matter where the project sets the option itself.
  const usedHere = new Set([...r.usedNames, ...r.files.map((f) => f.split("/").pop()!)].map((n) => n.toLowerCase()));
  const isUsed = (tok: string) => tok.length > 2 && usedHere.has(tok.toLowerCase());
  const keysOf = (n: GuideNote) => (n.keys?.length ? n.keys : [...n.text.matchAll(/`([^`]+)`/g)].map((m) => m[1]));
  const relevance = (n: GuideNote): "skip" | "hit" | "none" => {
    const keys = keysOf(n).map((k) => k.trim()).filter(Boolean);
    if (n.kind === "default") {
      const leaves = keys.map((k) => k.split(".").pop()!);
      if (leaves.some(isUsed)) return "skip";
      return keys.some((k) => k.split(".").slice(0, -1).some(isUsed)) ? "hit" : "none";
    }
    return keys.some((k) => k.split(/[^\w$.-]+/).some((tok) => isUsed(tok) || tok.split(".").some(isUsed))) ? "hit" : "none";
  };
  const guide = (r.guideNotes ?? []).map((n) => ({ n, rel: relevance(n) })).filter((g) => g.rel !== "skip");
  guide.sort((a, b) => Number(b.rel === "hit") - Number(a.rel === "hit"));
  let unrelated = 0;
  for (const { n, rel } of guide) {
    if (rel !== "hit" && ++unrelated > 6) continue;
    bullets.push({ text: sentence(n.text), tag: "guide", priority: rel === "hit" ? 92 : r.used ? 86 : 83 });
  }

  // Without a summary pass, the highest-scoring changelog entries stand in for it. With the guard on,
  // the ones it can't catch come first, guide notes or not: a guide covers a major, release notes
  // also cover the minors after it. Without the guard, an upgrade guide replaces them.
  if (!r.llmNotes?.length && opts.guard) {
    bullets.push(...guardInvisibleBullets(r.changelog?.items ?? [], usedChangelog, maxChangelogItems + 2, usage));
  } else if (!r.llmNotes?.length && !r.guideNotes?.length) {
    // With several concrete type notes already, only strong changelog entries add anything, and
    // weaker ones that name code this project uses.
    const threshold = (r.major ? 6 : 7) + (typeBullets >= 2 ? 2 : 0);
    const fresh = (r.changelog?.items ?? []).filter((i) => !usedChangelog.has(i.text) && !isListLabel(i.text));
    const strong = fresh.filter((i) => i.score >= threshold).slice(0, maxChangelogItems);
    const touched = fresh.filter((i) => i.score >= 2 && !strong.includes(i) && touches(i.text, usage).strong > 0).slice(0, MAX_TOUCHED_CHANGELOG);
    for (const item of [...strong, ...touched]) {
      bullets.push({ text: sentence(truncate(item.text, 240)), tag: "changelog", priority: 60 + item.score });
    }
  }

  // Removed/renamed exports this project doesn't import yet: names only, so the agent won't reach for them.
  // Not for a package used only through its config: its JS API isn't what the project relies on.
  const unusedRemoved = changes.filter((c) => !c.used && c.kind === "removed").map((c) => `\`${c.symbol}\``);
  const unusedRenamed = changes.filter((c) => !c.used && c.kind === "renamed").map((c) => c.detail.replace(" was renamed to ", " → "));
  if (unusedRenamed.length && !usage.configOnly) {
    bullets.push({ text: `Renamed: ${listCapped(unusedRenamed, 6)}.`, tag: "types", priority: 40 });
  }
  if (unusedRemoved.length && !usage.configOnly) {
    bullets.push({ text: `Also removed: ${listCapped(unusedRemoved, 10)}.`, tag: "types", priority: 30 });
  }

  // Notes that name what this project uses rank above the same kind of note that doesn't.
  for (const b of bullets) if (b.priority >= 50) b.priority += touchBoost(touches(b.text, usage));

  bullets.sort((a, b) => b.priority - a.priority);
  const merged = mergeSwaps(mergeSameOptionChanges(bullets));
  if (r.examples) for (const b of merged) if (r.examples[b.text]) b.example = r.examples[b.text];
  return { report: r, bullets: merged };
}

/** `MockLanguageModelV1` → `MockLanguageModelV4`: the same entry point added a higher version of the name. */
export function versionedSuccessor(sym: string, added: Set<string> | undefined): string | undefined {
  const m = sym.match(/^(.*[a-z]V)(\d+)$/);
  if (!m || !added) return undefined;
  let best: [number, string] | undefined;
  for (const a of added) {
    const n = a.startsWith(m[1]) && /^\d+$/.test(a.slice(m[1].length)) ? Number(a.slice(m[1].length)) : NaN;
    if (n > Number(m[2]) && (!best || n > best[0])) best = [n, a];
  }
  return best?.[1];
}

/**
 * With the guard on: release notes about changes that still type-check (a default, a behavior or a
 * setting that moved), then other explicitly breaking ones, which may well be removals the guard
 * will catch. One per specific heading: release notes often repeat a heading's claim in its body.
 */
function guardInvisibleBullets(
  items: Array<{ text: string; heading?: string; raw: string; version: string; score: number }>,
  used: Set<string>,
  max: number,
  usage?: ProjectUsage,
): Bullet[] {
  const ranked = items
    .map((i, index) => ({ i, index, c: classifyChangelogItem(i), touch: usage ? touches(i.text, usage) : { strong: 0, weak: 0 } }))
    .filter(({ i }) => !used.has(i.text) && !isListLabel(i.text))
    // A note that names code this project uses clears a lower bar.
    .filter(({ i, c, touch }) => (guardInvisible(c) ? i.score >= (touch.strong ? 0 : 2) : c.classes.includes("breaking") && i.score >= (touch.strong ? 2 : 6)))
    // A note that names the code it's about is easier to act on than "a few things have been removed".
    .map((x) => ({ ...x, priority: 78 + x.c.weight + Math.min(12, x.i.score) / 2 + (codeKeys(x.i.text).length ? 2 : 0) }))
    // Ties: the body over the heading's own one-liner, then release-note order.
    .sort((a, b) => b.priority + touchBoost(b.touch) - (a.priority + touchBoost(a.touch)) || Number(echoesHeading(a.i)) - Number(echoesHeading(b.i)) || a.index - b.index);
  // Beyond `max`, the ones about this project's code still get in.
  let extra = 0;
  const out: Bullet[] = [];
  const groups = new Set<string>();
  const texts = new Set<string>();
  const keySets: Set<string>[] = [];
  for (const { i, c, priority, touch } of ranked) {
    // Code that relies on a default never names the key, so for a default or a moved setting naming
    // its object is enough (`images` for `images.maximumRedirects`), as for edit-time notes.
    const mine = touch.strong > 0 || (touch.weak > 0 && (c.classes.includes("default") || c.classes.includes("config")));
    if (out.length >= max && !(mine && extra < MAX_TOUCHED_CHANGELOG)) continue;
    const heading = i.heading?.replace(/[^\p{L}\p{N}`.]+/gu, " ").trim();
    const group = heading && !GENERIC_HEADING.test(heading) ? `${i.version}|${heading}` : undefined;
    const text = sentence(truncate(i.text, 240));
    if ((group && groups.has(group)) || texts.has(text)) continue;
    // The same fix in two releases' notes names the same code: keep the first.
    const keys = new Set(codeKeys(i.text));
    if (keys.size && keySets.some((k) => [...keys].every((x) => k.has(x)) || [...k].every((x) => keys.has(x)))) continue;
    if (group) groups.add(group);
    texts.add(text);
    if (keys.size) keySets.push(keys);
    if (out.length >= max) extra++;
    out.push({ text, tag: "changelog", priority });
  }
  return out;
}

/** Release notes beyond the usual cap, when they name code the project uses. */
const MAX_TOUCHED_CHANGELOG = 6;

/**
 * "`NextConfig` keys that moved (deprecated ones still type-check): use `cacheComponents` instead of
 * `experimental.cacheComponents`, `experimental.ppr`, `experimental.dynamicIO`; …"
 * Keys are grouped by what replaces them; groups the changelog talks about most come first.
 */
function movedKeysText(owner: string, moved: Record<string, string>, pairs: Array<[string, string]>, items: Array<{ text: string }>, usage?: ProjectUsage): string {
  const groups = new Map<string, Set<string>>();
  for (const [key, hint] of Object.entries(moved)) {
    const successor = hint.match(/`([^`]+)`/)?.[1] ?? hint;
    const set = groups.get(successor) ?? new Set<string>();
    set.add(key);
    // Earlier names from the changelog: `experimental.dynamicIO` became `experimental.cacheComponents`.
    for (const [from, to] of pairs) if (to === key && from !== successor) set.add(from);
    groups.set(successor, set);
  }
  const leaf = (k: string) => k.slice(k.lastIndexOf(".") + 1);
  const mentions = (k: string) => {
    const re = new RegExp(`(?<![\\w$])${leaf(k).replace(/\$/g, "\\$")}(?![\\w$])`);
    return items.filter((i) => re.test(i.text)).length;
  };
  // Keys this project's config sets come first, and all of them are shown.
  const mine = (keys: string[]) => keys.some((k) => usage?.names.has(k));
  const ranked = [...groups].map(([successor, keys]) => ({ successor, keys: [...keys], weight: keys.size * 10 + mentions(successor) + [...keys].reduce((s, k) => s + mentions(k), 0) }));
  ranked.sort((a, b) => Number(mine(b.keys)) - Number(mine(a.keys)) || b.weight - a.weight);
  const shownCount = Math.max(3, ranked.filter((g) => mine(g.keys)).length);
  // `experimental.{ppr, dynamicIO}` → `cacheComponents`
  const keyList = (keys: string[]) => {
    const parents = new Set(keys.map((k) => k.slice(0, k.lastIndexOf("."))));
    if (keys.length > 1 && parents.size === 1 && !parents.has("")) return `\`${[...parents][0]}.{${keys.map(leaf).join(", ")}}\``;
    return keys.map((k) => `\`${k}\``).join(", ");
  };
  const shown = ranked.slice(0, shownCount).map((g) => `${keyList(g.keys)} → \`${g.successor}\``);
  const more = ranked.length > shownCount ? ` (+${ranked.length - shownCount} more)` : "";
  return `\`${owner}\` keys that moved (deprecated ones still type-check): ${shown.join("; ")}${more}.`;
}

const wordsOf = (n: string) =>
  new Set(
    n
      .replace(/^(experimental_|unstable_)/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[\s_]+/)
      .filter((w) => w.length >= 5),
  );

/** "; use `maxOutputTokens` instead of `maxTokens`; new options include `inputSchema`, `stopWhen`" */
function optionHints(
  removed: string[],
  added: string[],
  pairs: Array<[string, string]>,
  coMentioned: (added: string, removed: string[]) => boolean,
  docs: Record<string, string> = {},
): string {
  const renames: Array<[string, string]> = [];
  const taken = new Set<string>();
  for (const old of removed.filter((o) => !/^(experimental_|unstable_)/.test(o))) {
    const fromLog = pairs.find(([a, b]) => a === old && added.includes(b))?.[1];
    const ow = wordsOf(old);
    const similar = added.find((a) => !taken.has(a) && [...wordsOf(a)].some((w) => ow.has(w)));
    const to = fromLog ?? similar;
    if (to) {
      renames.push([old, to]);
      taken.add(to);
    }
  }
  // Only new options a changelog entry mentions alongside a removed one: otherwise it's a guess.
  const rest = added.filter((a) => !taken.has(a) && coMentioned(a, removed)).slice(0, 4);
  let out = "";
  if (renames.length) out += `; use ${renames.map(([a, b]) => `\`${b}\` instead of \`${a}\``).join(", ")}`;
  // (docs for renamed options are usually just the old meaning, so they're left out)
  if (rest.length) out += `; new options include ${rest.map((a) => (docs[a] && rest.indexOf(a) < 2 ? `\`${a}\` (${docs[a]})` : `\`${a}\``)).join(", ")}`;
  return out;
}

/**
 * zod 4 drops the same options from `string()`, `number()`, `boolean()`…: say it once.
 * Merges bullets that differ only in the function name.
 */
function mergeSameOptionChanges(bullets: Bullet[]): Bullet[] {
  const re = /^`([\w$.]+)\(\)` (options no longer accept .*)$/;
  const groups = new Map<string, Bullet[]>();
  const out: Bullet[] = [];
  for (const b of bullets) {
    const m = b.text.match(re);
    if (!m) {
      out.push(b);
      continue;
    }
    const key = m[2];
    if (!groups.has(key)) {
      groups.set(key, []);
      out.push(b); // placeholder keeps the first one's position
    }
    groups.get(key)!.push(b);
  }
  return out.map((b) => {
    const m = b.text.match(re);
    const group = m ? groups.get(m[2]) : undefined;
    if (!group || group.length < 2) return b;
    const fns = group.map((g) => g.text.match(re)![1]);
    const shown = fns.slice(0, 4).map((f) => `\`${f}()\``).join(", ") + (fns.length > 4 ? ` and ${fns.length - 4} more` : "");
    return { ...b, text: `${shown} ${m![2]}`, measured: group.some((g) => g.measured) || undefined, priority: Math.max(...group.map((g) => g.priority)) };
  });
}

/** Several removed exports with known successors read best as one list: `CoreMessage` → `ModelMessage`, … */
function mergeSwaps(bullets: Bullet[]): Bullet[] {
  const swaps = bullets.filter((b) => b.swap).sort((a, b) => b.priority - a.priority);
  if (swaps.length < 2) return bullets;
  const shown = swaps.slice(0, 8).map((b) => `\`${b.swap![0]}\` → \`${b.swap![1]}\``).join(", ");
  const more = swaps.length > 8 ? ` (+${swaps.length - 8} more)` : "";
  const merged: Bullet = {
    text: `Removed; use the replacements: ${shown}${more}.`,
    tag: "types",
    priority: Math.max(...swaps.map((b) => b.priority)),
    ...(swaps.some((b) => b.measured) ? { measured: true } : {}),
  };
  const out: Bullet[] = [];
  let placed = false;
  for (const b of bullets) {
    if (!b.swap) out.push(b);
    else if (!placed) {
      out.push(merged);
      placed = true;
    }
  }
  return out;
}

function listCapped(items: string[], max: number): string {
  return items.length > max ? `${items.slice(0, max).join(", ")} (+${items.length - max} more)` : items.join(", ");
}

const pkgOrder = (a: PackageNotes, b: PackageNotes) =>
  Number(b.report.used) - Number(a.report.used) ||
  Number(b.report.major) - Number(a.report.major) ||
  (b.bullets[0]?.priority ?? 0) - (a.bullets[0]?.priority ?? 0) ||
  a.report.name.localeCompare(b.report.name);

export interface RenderOptions extends NotesOptions {
  model: ResolvedModel;
  hash: string;
  budgetTokens: number;
  maxBulletsPerPackage: number;
  generatedAt: Date;
  /** Verdicts from `stalemap probe` for this model, when available. */
  measured?: Measurements;
}

export const START = "<!-- stalemap:start -->";
export const END = "<!-- stalemap:end -->";

export interface RenderResult {
  block: string;
  tokens: number;
  included: { name: string; bullets: number }[];
  dropped: number;
}

/**
 * Fit the notes into the token budget: first every package's most important bullets,
 * then the rest in priority order across packages.
 */
export function renderBlock(reports: PackageReport[], opts: RenderOptions, maxChangelogItems: number): RenderResult {
  const notes = reports
    .filter((r) => r.status === "changed")
    .map((r) => buildPackageNotes(r, maxChangelogItems, opts.measured, { guard: opts.guard }))
    .filter((n) => n.bullets.length)
    .sort(pkgOrder);
  const quiet = reports.filter((r) => r.status === "changed" && !notes.some((n) => n.report.name === r.name));
  const fresh = reports.filter((r) => r.status === "new");

  const cutoff = isoDate(opts.model.cutoff);
  const header = [
    START,
    `<!-- generated by stalemap ${isoDate(opts.generatedAt)} · model=${opts.model.id} · cutoff=${cutoff} · deps=${opts.hash} -->`,
    `## Dependencies that changed after your training data`,
    ``,
    `Your training data (\`${opts.model.id}\`, cutoff ${cutoff}) predates the versions this project pins. When a note below conflicts with what you remember, follow the note: it describes the installed version. Tags: [types] = diff of the published type declarations, [changelog] = release notes, [guide] = the package's upgrade guide, [summary] = summary of both${opts.measured ? ", measured = you got this wrong in a test without the note" : ""}.`,
  ].join("\n");

  const footer: string[] = [];
  if (quiet.length) {
    footer.push(
      `Also newer than your training data, no notable API changes found: ${quiet
        .map((r) => `\`${r.name}\` ${r.baseline!.version} → ${r.pinned}`)
        .join(", ")}.`,
    );
  }
  if (fresh.length) {
    footer.push(
      `First released after your cutoff, so you have no training data on them; read their docs or types before using: ${fresh
        .map((r) => `\`${r.name}@${r.pinned}\``)
        .join(", ")}.`,
    );
  }

  const fixedTokens = estimateTokens(header + footer.join("\n") + END) + 10;
  let remaining = opts.budgetTokens - fixedTokens;

  const chosen = new Map<string, Bullet[]>();
  const headLine = (n: PackageNotes) =>
    `**${n.report.name}** ${n.report.baseline!.version} → ${n.report.pinned}${n.report.major ? " (major)" : ""}${n.report.used ? "" : " (not imported directly)"}`;
  const bulletLine = (b: Bullet) =>
    `- ${b.text} [${b.tag}${b.measured ? ", measured" : ""}]` +
    (b.example ? `\n  Before: \`${b.example.before.replace(/`/g, "'")}\` → After: \`${b.example.after.replace(/`/g, "'")}\` (type-checked)` : "");

  // Pass 1: each package's top bullets (high priority only).
  for (const n of notes) {
    const top = n.bullets.filter((b) => b.priority >= 85).slice(0, 2);
    const first = top.length ? top : n.bullets.slice(0, 1);
    const cost = estimateTokens(headLine(n)) + first.reduce((s, b) => s + estimateTokens(bulletLine(b)), 0) + 2;
    if (cost > remaining) continue;
    remaining -= cost;
    chosen.set(n.report.name, [...first]);
  }
  // Pass 2: everything else by priority, round-robin by rank.
  const rest = notes
    .flatMap((n) => n.bullets.map((b, i) => ({ n, b, i })))
    .filter(({ n, b }) => !chosen.get(n.report.name)?.includes(b))
    .sort((x, y) => y.b.priority - x.b.priority || x.i - y.i);
  let dropped = 0;
  for (const { n, b } of rest) {
    const list = chosen.get(n.report.name);
    const extraHead = list ? 0 : estimateTokens(headLine(n)) + 2;
    const cost = estimateTokens(bulletLine(b)) + extraHead;
    if ((list?.length ?? 0) >= opts.maxBulletsPerPackage || cost > remaining) {
      dropped++;
      continue;
    }
    remaining -= cost;
    chosen.set(n.report.name, [...(list ?? []), b]);
  }

  const body: string[] = [];
  const included: RenderResult["included"] = [];
  for (const n of notes) {
    const list = chosen.get(n.report.name);
    if (!list?.length) continue;
    list.sort((a, b) => b.priority - a.priority);
    body.push(headLine(n), ...list.map(bulletLine), "");
    included.push({ name: n.report.name, bullets: list.length });
  }
  if (!body.length && !footer.length) {
    body.push("No dependency in this project changed in a way that matters since your training cutoff.", "");
  }

  const block = [header, "", ...body, ...(footer.length ? [...footer, ""] : []), END].join("\n");
  return { block, tokens: estimateTokens(block), included, dropped };
}
