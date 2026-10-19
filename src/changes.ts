import { isConventionalBreaking, type ChangelogItem } from "./changelog.js";
import type { TypeChange } from "./typediff.js";

/**
 * What kind of change a release note describes, judged from its wording. The guard reports compile
 * errors, so it catches removed and renamed APIs once the agent uses them. It can't catch a changed
 * default, a change in behavior or a setting that moved: the old code still type-checks.
 */
export type ChangeClass = "breaking" | "default" | "behavior" | "config";

/** "[breaking]", "BREAKING CHANGE", a ⚠️ or 🚨 heading, `feat!:`. Not "Major Changes": every changeset major is one. */
const BREAKING_TEXT = /\[breaking\]|\bbreaking change|^breaking\b|^⚠|🚨/i;
const BREAKING_HEADING = /\bbreaking\b|⚠|🚨/i;

/** A default value changed: "now defaults to", "enable X by default", "bump default `x` from 1 min to 4 hours". */
const DEFAULT_CHANGE =
  /\bby default\b|\bnow defaults?\b|\bdefaults? (?:to|is now|has changed|changed|value)\b|\b(?:new|changed?|changes|bump(?:s|ed)?|flip(?:s|ped)?|switch(?:es|ed)?|raise[sd]?|lower(?:s|ed)?|increase[sd]?|decrease[sd]?|update[sd]?) (?:the )?defaults?\b|\bdefault \S+ (?:is|was) now\b/i;

/** Code that used to work fails or means something else at run time. */
const STRONG_BEHAVIOR =
  /\bnow (?:throws?|errors?|fails?|rejects?|returns?|resolves?|holds?|contains?|only (?:holds?|contains?|includes?|returns?))\b|\b(?:disallowed|not allowed)\b|\bthrows? (?:an? )?(?:error|exception)\b|\bis now an error\b|\bas (?:a )?promises?\b|\b(?:is|are) now (?:async|asynchronous|a promise|promises)\b|\binstead of (?:returning|throwing)\b/i;
const WEAK_BEHAVIOR = /\bno longer\b|\bsilently\b|\bnow (?:includes?|validates?|passes|emits?|runs?|treats?|ignores?)\b/i;

/** A setting or schema field that moved: "`datasource.url` is now configured in the config file". */
const CONFIG_MOVE =
  /\bmoved? (?:to|into|from|out of)\b|\b(?:now|must be|should be|are|is) (?:configured|set|defined|declared|specified) in\b|\bconfig(?:uration)? file\b|\bin (?:the |your )?config\b/i;

export interface ChangelogClassification {
  classes: ChangeClass[];
  /** 0 when none applies; higher = less likely the guard or the type checker will notice. */
  weight: number;
}

export function classifyChangelogItem(item: Pick<ChangelogItem, "text" | "heading" | "raw">): ChangelogClassification {
  const classes: ChangeClass[] = [];
  let weight = 0;
  const invisible: number[] = [];
  if (BREAKING_TEXT.test(item.text) || BREAKING_HEADING.test(item.heading ?? "") || isConventionalBreaking(item.raw ?? "")) classes.push("breaking");
  if (DEFAULT_CHANGE.test(item.text)) {
    classes.push("default");
    invisible.push(6);
  }
  if (STRONG_BEHAVIOR.test(item.text)) {
    classes.push("behavior");
    invisible.push(6);
  } else if (WEAK_BEHAVIOR.test(item.text)) {
    classes.push("behavior");
    invisible.push(3);
  }
  if (CONFIG_MOVE.test(item.text)) {
    classes.push("config");
    invisible.push(6);
  }
  if (invisible.length) weight += Math.max(...invisible) + (invisible.length > 1 ? 1 : 0);
  if (classes.includes("breaking")) weight += 3;
  return { classes, weight };
}

/** The item describes a change that still type-checks: a default, behavior or config move. */
export const guardInvisible = (c: ChangelogClassification) => c.classes.some((k) => k !== "breaking");

/**
 * Type changes the compiler reports once code uses the old API: a removed or renamed export, a
 * removed option or member, a parameter that became required. Deprecations still compile.
 */
export function compileVisible(c: TypeChange): boolean {
  if (c.kind === "removed" || c.kind === "renamed" || c.kind === "signature") return true;
  if (c.kind === "subpath") return c.severity >= 9; // a removed entry point; a new one is just news
  if (c.kind === "params") return c.severity >= 8;
  if (c.kind === "members") return !!c.meta?.members?.length;
  return false;
}

/** Types that hold settings, whose deprecated or moved members are config keys: `NextConfig`, `CompilerOptions`. */
export const CONFIG_TYPE = /(?:Config|Configuration|Options|Settings)$/;

/** The item only repeats its heading ("`.pick()` disallowed…" under "⚠️ `.pick()` disallowed…"). */
export function echoesHeading(item: { text: string; heading?: string }): boolean {
  const plain = (t: string) => t.replace(/\([^)]*\)/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
  return !!item.heading && plain(item.heading) === plain(item.text);
}

/** A label over a nested list ("browser:; …"): it repeats its sub-items, which are items of their own. */
export const isListLabel = (text: string) => /^[\w\s/-]{1,30}:;/.test(text);

/** Words that name nothing on their own: matching them would tie a note to any file. */
const GENERIC = new Set([
  "config", "configs", "options", "option", "opts", "props", "params", "args", "result", "results", "res", "req", "request",
  "response", "data", "error", "errors", "value", "values", "ctx", "context", "this", "process", "window", "document",
  "module", "exports", "default", "type", "types", "string", "number", "boolean", "object", "array", "function", "true",
  "false", "null", "undefined", "async", "await", "return", "import", "export", "const", "next", "prisma", "client", "server",
]);

/**
 * Code names a release note mentions: `images.minimumCacheTTL`, `.pick()`, `datasource.url`, a bare
 * camelCase name like generateSitemap, or an entry point like `next/image`.
 */
export function codeKeys(text: string): string[] {
  const keys = new Set<string>();
  const add = (raw: string) => {
    const k = raw.replace(/\(\)$/, "").replace(/^\./, "").replace(/^<|>$/g, "");
    if (/^[@A-Za-z_$][\w$-]*(?:[./][A-Za-z_$][\w$-]*)*$/.test(k) && !(GENERIC.has(k.toLowerCase()) || k.length < 2)) keys.add(k);
  };
  for (const m of text.matchAll(/`([^`\n]{2,80})`/g)) add(m[1].trim());
  const bare = text.replace(/`[^`]*`/g, " ");
  // camelCase or PascalCase with an inner capital: generateSitemap, ScrollHandler, cacheComponents.
  for (const m of bare.matchAll(/(?<![\w$./-])[A-Za-z_$][a-z0-9_$]*[A-Z][\w$]*(?![\w$])/g)) if (/[a-z][A-Z]/.test(m[0])) add(m[0]);
  // Entry points: next/image, vitest/node.
  for (const m of bare.matchAll(/(?<![\w$./@-])(?:@[\w-]+\/)?[a-z][\w-]+\/[a-z][\w-]*(?![\w$/])/g)) add(m[0]);
  // Dotted paths: images.qualities, config.experimental.ppr (not versions or file names like next.config.js).
  for (const m of bare.matchAll(/(?<![\w$./-])[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+(?![\w$])/g)) {
    if (!/\.(?:[cm]?[jt]sx?|json|md|css|html)$/.test(m[0])) add(m[0]);
  }
  return [...keys];
}

/** Heads that hold this many different keys in a package's notes are namespaces, not features. */
const NAMESPACE_LEAVES = 8;
const namespaceCache = new WeakMap<object, Set<string>>();

/**
 * Objects whose keys are unrelated features (`experimental` in Next: dozens of flags) rather than
 * settings of one feature (`images`): a file that sets one `experimental` flag doesn't rely on the
 * default of another. Judged from the package's own release notes and moved keys: a head that many
 * different keys sit under.
 */
export function namespaceHeads(r: { changelog?: { items: Array<{ text: string }> }; types?: { changes: TypeChange[] } }): Set<string> {
  const hit = namespaceCache.get(r);
  if (hit) return hit;
  const leaves = new Map<string, Set<string>>();
  const note = (k: string) => {
    const parts = k.split(".");
    if (parts.length < 2) return;
    const set = leaves.get(parts[0]) ?? new Set<string>();
    set.add(parts[parts.length - 1]);
    leaves.set(parts[0], set);
  };
  for (const i of r.changelog?.items ?? []) for (const k of codeKeys(i.text)) if (!k.includes("/")) note(k);
  for (const c of r.types?.changes ?? []) for (const k of Object.keys(c.meta?.movedKeys ?? {})) note(k);
  const out = new Set([...leaves].filter(([, v]) => v.size >= NAMESPACE_LEAVES).map(([h]) => h));
  namespaceCache.set(r, out);
  return out;
}

/** Every identifier in a file's text (code, config keys, schema fields). */
export function identifiersIn(text: string): Set<string> {
  return new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? []);
}

const variants = (name: string) => [name, name.endsWith("s") ? name.slice(0, -1) : `${name}s`];
const specific = (name: string) => name.length >= 4 && !GENERIC.has(name.toLowerCase());

/**
 * Which of a note's keys the edited text touches. A dotted key counts when the text has its last
 * segment, or its first one when that's specific (`images` for `images.minimumCacheTTL`, since code
 * that relies on a default never names the key). Singular and plural count as the same name. Entry
 * points don't match identifiers: `next/image` isn't the `images` config key.
 */
export function matchedKeys(keys: string[], idents: Set<string>): string[] {
  return keys.filter((k) => matchStrength(k, idents) > 0);
}

/** 2: the text names the key itself (its last segment); 1: only the object it belongs to; 0: neither. */
export function matchStrength(key: string, idents: Set<string>, namespaces?: Set<string>): 0 | 1 | 2 {
  // An entry point (`next/image`) is about code that imports it; see `editNotesFor`.
  if (key.includes("/")) return 0;
  const has = (n: string) => variants(n).some((v) => idents.has(v));
  const parts = key.split(/[./]/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (specific(last) && has(last)) return 2;
  // A namespace (`experimental`) names nothing about one of its keys.
  const head = parts.length > 1 && specific(parts[0]) && !parts[0].startsWith("@") && !namespaces?.has(parts[0]) && has(parts[0]);
  // `datasource.url`: a short last segment counts once its object is there too.
  return head && last.length >= 2 && idents.has(last) ? 2 : head ? 1 : 0;
}
