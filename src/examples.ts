import { join } from "node:path";
import type { PackageReport } from "./analyze.js";
import { extractCode, gradeCode } from "./probe/grade.js";
import type { Provider } from "./probe/providers.js";
import { packageRoot } from "./registry.js";
import { buildPackageNotes, type Bullet } from "./render.js";
import { surfaceFor, type TypeChange } from "./typediff.js";
import { TOOL_VERSION, cacheDir, debug, readJson, sha256, truncate, writeJsonAtomic } from "./util.js";

/** A before/after pair shown under a note. `after` was compiled against the pinned version. */
export interface Example {
  before: string;
  after: string;
}

const MAX_EXAMPLES_PER_PACKAGE = 4;

const SYSTEM = `You write tiny migration examples for a coding agent whose knowledge of a library is out of date. You get a note about an API change, the library's current type declarations and changelog entries. Use only those: never invent APIs. Answer with JSON only.`;

function changeFor(r: PackageReport, b: Bullet): TypeChange | undefined {
  const names = [...b.text.matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/\(\)$/, ""));
  return r.types?.changes.find((c) => c.kind !== "added" && names.includes(c.symbol.split(".").pop()!));
}

/** Evidence for one note: the current declaration of the API it's about, option docs, changelog lines. */
async function evidence(r: PackageReport, b: Bullet): Promise<string> {
  const parts: string[] = [];
  const c = changeFor(r, b);
  const names = new Set([...b.text.matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/\(\)$/, "")));
  // The current declarations of the APIs the note names (the function, its replacement, helpers).
  const surface = await surfaceFor(join(packageRoot(r.name, r.pinned!), "node_modules", r.name), r.name, r.pinned!, c?.subpath ?? ".");
  if (surface) {
    const decls = [...names]
      .filter((n) => surface[n] && surface[n].kind !== "reexport")
      .slice(0, 5)
      .map((n) => `- ${n}: ${truncate(surface[n].text, n === c?.symbol ? 1500 : 400)}`);
    // Helpers the new options mention by name (e.g. `isStepCount` in a default value).
    for (const doc of Object.values(c?.meta?.optionDocs ?? {})) {
      for (const m of doc.matchAll(/`([A-Za-z_$][\w$]*)\(/g)) {
        if (surface[m[1]] && !names.has(m[1])) decls.push(`- ${m[1]}: ${truncate(surface[m[1]].text, 400)}`);
      }
    }
    if (decls.length) parts.push(`Current declarations (${r.name}@${r.pinned}):\n${decls.join("\n")}`);
  }
  if (c?.meta?.optionDocs) {
    parts.push(
      "Option docs (current version):\n" +
        Object.entries(c.meta.optionDocs)
          .slice(0, 8)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n"),
    );
  }
  const items = (r.changelog?.items ?? []).filter((i) => [...names].some((n) => n.length > 2 && i.raw.includes(n))).slice(0, 4);
  if (items.length) parts.push("Changelog entries:\n" + items.map((i) => `### ${i.version}\n${truncate(i.raw, 1200)}`).join("\n\n"));
  return parts.join("\n\n");
}

function prompt(r: PackageReport, b: Bullet, ev: string, repair?: { code: string; errors: string[] }): string {
  const spec = r.name;
  const base = `Package: \`${spec}@${r.pinned}\` (the agent remembers ${r.baseline?.version}).
Note: ${b.text}

${ev}

Return JSON: {"before": "<one line of the OLD usage the note warns about>", "after": "<one line of the NEW, correct usage>", "module": "<a complete minimal TypeScript module for ${spec}@${r.pinned} containing the after line, with imports>"}
- "before" and "after" are single lines of at most 100 characters each, written the way the code appears in a project.
- "module" must type-check against ${spec}@${r.pinned}. Use placeholders like \`declare const model: LanguageModel\` for values you'd otherwise need to construct.
- If the note can't be shown as code, return {"skip": true}.`;
  if (!repair) return base;
  return `${base}

Your previous module failed to type-check against ${spec}@${r.pinned}:
\`\`\`ts
${repair.code}
\`\`\`
Errors:
${repair.errors.map((e) => `- ${e}`).join("\n")}

Fix it. Return the same JSON shape.`;
}

function parseReply(reply: string): { before?: string; after?: string; module?: string; skip?: boolean } | undefined {
  const json = reply.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

const squash = (s: string) => s.replace(/\s+/g, "");

/** Names the note says are gone: the "after" must not use them. */
function removedNames(c: TypeChange | undefined): string[] {
  if (!c) return [];
  if (c.kind === "removed" || c.kind === "renamed") return [c.symbol];
  return [...(c.meta?.removedOptions ?? []), ...(c.meta?.removedParams ?? [])].filter((n) => !n.startsWith("#"));
}

function exampleKey(r: PackageReport, b: Bullet, model: string): string {
  return join(cacheDir(), "examples", `${sha256(JSON.stringify([TOOL_VERSION, model, r.name, r.baseline?.version, r.pinned, b.text])).slice(0, 24)}.json`);
}

async function oneExample(r: PackageReport, b: Bullet, provider: Provider, model: string): Promise<Example | undefined> {
  const ev = await evidence(r, b);
  const c = changeFor(r, b);
  const forbidden = removedNames(c);
  let repair: { code: string; errors: string[] } | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await provider.complete(model, `${SYSTEM}\n\n${prompt(r, b, ev, repair)}`);
    const out = parseReply(reply);
    if (!out || out.skip || !out.before || !out.after || !out.module) return undefined;
    const code = extractCode("```ts\n" + out.module + "\n```");
    if (!squash(code).includes(squash(out.after))) {
      repair = { code, errors: ["the module doesn't contain the \"after\" line verbatim"] };
      continue;
    }
    // Verified = compiles against the pinned version with no API errors and no use of what was removed.
    const grade = await gradeCode(code, { packageRoot: packageRoot(r.name, r.pinned!), names: [], apiNames: [] });
    const strict = await strictErrors(code, r);
    const usesRemoved = forbidden.filter((n) => new RegExp(`(?<![\\w$])${n.replace(/[$]/g, "\\$")}(?![\\w$])`).test(out.after!));
    if (grade.verdict !== "no-code" && !strict.length && !usesRemoved.length) {
      return { before: truncate(out.before.trim(), 110), after: truncate(out.after.trim(), 120) };
    }
    repair = { code, errors: [...strict, ...usesRemoved.map((n) => `the after line still uses \`${n}\`, which was removed`)] };
    debug(`example for ${r.name} failed verification (attempt ${attempt + 1}): ${repair.errors.join("; ").slice(0, 200)}`);
  }
  return undefined;
}

/** Any API-shaped compiler error in the module (gradeCode only reports errors tied to given names). */
async function strictErrors(code: string, r: PackageReport): Promise<string[]> {
  const { typecheck } = await import("./probe/grade.js");
  return (await typecheck(code, packageRoot(r.name, r.pinned!))).filter((d) => !/Cannot find module|implicitly has an 'any'/.test(d));
}

/** Generate (or load cached) verified examples for a package's top notes, keyed by note text. */
export async function examplesFor(r: PackageReport, provider: Provider | undefined, model: string, useCache: boolean): Promise<Record<string, Example>> {
  if (r.status !== "changed") return {};
  const bullets = buildPackageNotes(r, 4).bullets.filter((b) => b.tag === "types" && !b.swap && !b.text.startsWith("Also removed") && !b.text.startsWith("Removed;"));
  const out: Record<string, Example> = {};
  for (const b of bullets.slice(0, MAX_EXAMPLES_PER_PACKAGE)) {
    const path = exampleKey(r, b, model);
    const hit = await readJson<{ example: Example | null }>(path);
    if (hit && useCache) {
      if (hit.example) out[b.text] = hit.example;
      continue;
    }
    if (!provider) continue; // cache-only (the guard hook)
    let example: Example | undefined;
    try {
      example = await oneExample(r, b, provider, model);
    } catch (err) {
      debug(`example for ${r.name} failed: ${(err as Error).message}`);
      continue; // don't cache provider errors
    }
    await writeJsonAtomic(path, { example: example ?? null });
    if (example) out[b.text] = example;
  }
  return out;
}
