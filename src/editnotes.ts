import type { PackageReport } from "./analyze.js";
import { GENERIC_HEADING } from "./changelog.js";
import { classifyChangelogItem, codeKeys, CONFIG_TYPE, echoesHeading, guardInvisible, identifiersIn, isListLabel, matchStrength, namespaceHeads } from "./changes.js";
import { sha256, truncate } from "./util.js";

/**
 * Edit-time notes: changes below the notes block's cut that the edited text touches. The guard only
 * speaks up about compile errors; these are changes that still type-check (a default that changed,
 * a behavior, a setting that moved), so they come up when the agent writes the code they affect:
 * `images: {…}` in next.config.ts, `datasource db {…}` in schema.prisma, `.pick()` on a schema.
 */
export interface EditNote {
  pkg: string;
  /** Stable across edits and sessions: what "already shown" is keyed by. */
  key: string;
  text: string;
  /** Code names from the note that the edited text has. */
  matched: string[];
  rank: number;
}

/** Notes shown per edit, after the ones already shown this session are dropped. */
export const MAX_EDIT_NOTES = 3;

/**
 * Changelog items about changes that still type-check, and deprecated config keys, whose code names
 * appear in `text`. Ranked: more names matched first, then how invisible the change is.
 */
/** Wording that says behavior changed, for items the classifier leaves unplaced. */
const CHANGE_WORDING = /\b(?:now only|previously|no longer|used to|instead of|now (?:rejects?|accepts?|throws?|returns?|requires?|ignores?|strips?|keeps?))\b/i;

export function editNotesFor(text: string, reports: PackageReport[], alreadyReported: string[] = []): EditNote[] {
  const idents = identifiersIn(text);
  // Entry points the text imports or names in a string: `from "next/image"`.
  const imported = new Set([...text.matchAll(/["'`]((?:@[\w.-]+\/)?[\w.-]+(?:\/[\w.-]+)+)["'`]/g)].map((m) => m[1]));
  const reported = alreadyReported.join("\n");
  const found: Array<EditNote & { group?: string; echo: boolean }> = [];
  const lastOf = (k: string) => k.split(/[./]/).pop()!;
  let namespaces = new Set<string>();
  const add = (pkg: string, noteText: string, keys: string[], weight: number, group?: string, echo = false, headOnly = true, exactOnly = false) => {
    // A note about `StreamObjectResult`'s `finishReason` isn't about a file that only has a `finishReason`
    // key: when the note names types and the file uses none of them, its member names don't count.
    const owners = keys.map((k) => k.split(/[./]/)[0]).filter((h) => /^[A-Z$]/.test(h) && /[a-z]/.test(h));
    const ownerless = owners.length > 0 && !owners.some((o) => idents.has(o));
    const strengths = keys
      .map((k) => [k, k.includes("/") ? (imported.has(k) ? 2 : 0) : matchStrength(k, idents, namespaces)] as const)
      .filter(([k, m]) => (m === 2 || (m === 1 && headOnly && !exactOnly)) && !(ownerless && /^[a-z_$]/.test(lastOf(k)) && !/^[A-Z]/.test(k)));
    if (!strengths.length) return;
    const matched = strengths.map(([k]) => k);
    // The guard already reported a problem about the same names: the note would repeat it.
    if (matched.every((m) => reported.includes(lastOf(m)))) return;
    // Naming the key itself (`pick`) counts for more than naming its object (`images` for `images.x`);
    // `z.email` and `z.regexes.email` are one name.
    const best = new Map<string, number>();
    // A long, specific name (`strictObject`) is better evidence than a common one (`email`).
    for (const [k, m] of strengths) best.set(lastOf(k), Math.max(best.get(lastOf(k)) ?? 0, m === 2 ? 10 + Math.min(4, Math.max(0, lastOf(k).length - 6)) : 4));
    const rank = [...best.values()].reduce((a, b) => a + b, 0) + 2 * weight;
    found.push({ pkg, key: sha256(`${pkg}\0${noteText}`).slice(0, 16), text: noteText, matched, rank, group, echo });
  };
  for (const r of reports) {
    if (r.status !== "changed") continue;
    namespaces = namespaceHeads(r);
    // The package's own name (`vitest` in "output files to `.vitest`") is in every file that uses it.
    const own = new Set([r.name, r.name.split("/").pop()!, r.name.replace(/^@/, "").split("/")[0]]);
    for (const item of r.changelog?.items ?? []) {
      if (isListLabel(item.text)) continue;
      const c = classifyChangelogItem(item);
      // A name match is strong evidence on its own, so the score bar is lower than the block's. An item
      // the classifier can't place but that says what changed ("now only rejects…", "no longer…") counts
      // when the file uses one of its names exactly.
      const usual = guardInvisible(c) ? item.score >= -2 : c.classes.includes("breaking") && item.score >= 4;
      const worded = !usual && item.score >= -2 && CHANGE_WORDING.test(item.text);
      if (!usual && !worded) continue;
      const heading = item.heading && !GENERIC_HEADING.test(item.heading.trim()) ? `${r.name}|${item.version}|${item.heading}` : undefined;
      const echo = echoesHeading(item);
      // Code that relies on a default never names the key, so its object is enough (`images` for
      // `images.minimumCacheTTL`); other notes need the name itself.
      const headOnly = c.classes.includes("default") || c.classes.includes("config");
      const keys = codeKeys(item.text).filter((k) => !own.has(k));
      add(r.name, `${truncate(item.text, 240)} (changelog, ${item.version})`, keys, c.weight + Math.min(12, item.score) / 4, heading, echo, headOnly, worded);
    }
    for (const ch of r.types?.changes ?? []) {
      const owner = ch.symbol.split(".")[0];
      if (ch.kind !== "deprecated" || !CONFIG_TYPE.test(owner)) continue;
      // Moved nested keys (`NextConfig.experimental`) are about each key, not about `experimental`.
      const members = ch.meta?.movedKeys ? Object.keys(ch.meta.movedKeys) : ch.symbol.includes(".") ? [ch.symbol.slice(owner.length + 1)] : (ch.meta?.members ?? []);
      // A deprecated key matters where the file sets it, not where it sets a neighbor.
      add(r.name, ch.detail.endsWith(".") ? ch.detail : `${ch.detail}.`, members, 5, undefined, false, false);
    }
  }
  // One per release-note heading and per text: a heading's items often say the same thing twice,
  // and the body says more than the heading's own one-liner.
  found.sort((a, b) => b.rank - a.rank || Number(a.echo) - Number(b.echo));
  const groups = new Set<string>();
  const keys = new Set<string>();
  const out: EditNote[] = [];
  for (const { group, echo: _echo, ...n } of found) {
    if (keys.has(n.key) || (group && groups.has(group))) continue;
    keys.add(n.key);
    if (group) groups.add(group);
    out.push(n);
  }
  return out;
}

/** The normalized start of a note, to tell whether a notes block already says it. */
export const noteFingerprint = (text: string) =>
  text
    .replace(/ \(changelog, [^)]*\)$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase()
    .slice(0, 60);
