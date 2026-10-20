/**
 * Builds the heldout-v4 package frame data (see ../PROTOCOL.md, "Frame"). The candidate pool, categories, families and
 * GitHub declaration counts are v3's, read from ../../heldout-v3/sampling/frame.json (searched 2026-10-16, not
 * refreshed). For every candidate this refreshes the npm registry data for the v4 window: the version the template pins
 * (the newest stable release on or before the window's end), whether that version has TypeScript types (bundled, or a
 * DefinitelyTyped @types package), and its stable releases inside the window, flagging the ones that open a new
 * semver-major line (a new minor line below 1.0). Output: frame.json, sorted by declarations; PROTOCOL.md summarizes it.
 *
 *   npx tsx bench/heldout-v4/sampling/frame.ts [--cache <dir>]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
/** Releases strictly after claude-sonnet-5-5's cutoff and no later than the day before the frame was built. */
export const WINDOW = { after: "2026-06-30T23:59:59.999Z", until: "2026-10-19T23:59:59.999Z" };

interface Packument {
  error?: string;
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<string, { types?: string; typings?: string; exports?: unknown }>;
}
interface V3Row { name: string; category: string; family: string; githubDeclarations: number }

const stable = (v: string) => /^\d+\.\d+\.\d+$/.test(v);
const parts = (v: string) => v.split(".").map(Number);
/** The semver line a version belongs to: its major, or major.minor below 1.0. */
const line = (v: string) => (parts(v)[0] === 0 ? `0.${parts(v)[1]}` : `${parts(v)[0]}`);
const newer = (p: string, q: string) => {
  const [a, b, c] = parts(p), [x, y, z] = parts(q);
  return a !== x ? a > x : b !== y ? b > y : c > z;
};
const hasTypesCondition = (e: unknown): boolean =>
  typeof e === "object" && e !== null && Object.entries(e).some(([k, v]) => k === "types" || hasTypesCondition(v));

async function fetchJson(url: string, cacheFile: string, allowMissing = false): Promise<unknown> {
  if (existsSync(cacheFile)) return JSON.parse(await readFile(cacheFile, "utf8"));
  const res = await fetch(url);
  if (allowMissing && res.status === 404) {
    await writeFile(cacheFile, JSON.stringify({ error: "not found" }));
    return { error: "not found" };
  }
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const text = await res.text();
  await writeFile(cacheFile, text);
  return JSON.parse(text);
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { cache: { type: "string", default: join(HERE, "..", "..", ".work", "frame-cache-v4") } } });
  const cache = values.cache!;
  await mkdir(cache, { recursive: true });
  const v3 = JSON.parse(await readFile(join(HERE, "..", "..", "heldout-v3", "sampling", "frame.json"), "utf8")) as { rows: V3Row[] };
  const rows = [];
  for (const { name, category, family, githubDeclarations } of v3.rows) {
    const safe = name.replace("/", "__");
    const doc = (await fetchJson(`https://registry.npmjs.org/${name}`, join(cache, `${safe}.packument.json`))) as Packument;
    const ordered = Object.keys(doc.versions).filter(stable).filter((v) => doc.time[v]).sort((p, q) => (doc.time[p] < doc.time[q] ? -1 : 1));
    const upToEnd = ordered.filter((v) => doc.time[v] <= WINDOW.until);
    // The pinned version: the highest stable version published by the window's end (not a later backport).
    const pinned = upToEnd.reduce<string | undefined>((best, v) => (!best || newer(v, best) ? v : best), undefined);
    const m = (pinned && doc.versions[pinned]) || {};
    const bundledTypes = name === "typescript" || !!(m.types || m.typings || hasTypesCondition(m.exports));
    const dt = `@types/${name.startsWith("@") ? name.slice(1).replace("/", "__") : name}`;
    const definitelyTyped = !bundledTypes && !((await fetchJson(`https://registry.npmjs.org/${dt}`, join(cache, `${dt.replace("/", "__")}.packument.json`), true)) as Packument).error;
    const inWindow = upToEnd.filter((v) => doc.time[v] > WINDOW.after && !newer(v, pinned!));
    // A release opens a new line when no earlier stable release is on that line or a newer one (backports don't).
    const newLines = inWindow.filter((v) => {
      const earlier = ordered.slice(0, ordered.indexOf(v));
      return earlier.length > 0 && !earlier.some((p) => line(p) === line(v) || newer(p, v));
    });
    rows.push({
      name,
      category,
      family,
      githubDeclarations,
      pinned,
      pinnedPublished: pinned ? doc.time[pinned] : undefined,
      types: bundledTypes ? "bundled" : definitelyTyped ? dt : null,
      stableReleasesInWindow: inWindow.length,
      releasesInWindow: inWindow.map((v) => `${v} (${doc.time[v].slice(0, 10)})`),
      newMajorLinesInWindow: newLines.map((v) => `${v} (${doc.time[v].slice(0, 10)})`),
    });
    process.stderr.write(`${name} `);
  }
  rows.sort((a, b) => b.githubDeclarations - a.githubDeclarations);
  await writeFile(join(HERE, "frame.json"), JSON.stringify({ declarationsFrom: "heldout-v3/sampling/frame.json (GitHub code search, 2026-10-16)", window: WINDOW, rows }, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(`frame: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
