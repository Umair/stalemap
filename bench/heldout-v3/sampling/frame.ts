/**
 * Builds the heldout-v3 package frame (see ../PROTOCOL.md, "Sampling"). For every package in candidates.txt it
 * records its category, how many package.json files on GitHub declare it (GitHub code search for `"<name>":` in files
 * named package.json; needs `gh` signed in, about 7 s per package for the search rate limit), npm downloads for one
 * fixed week, whether it has TypeScript types (bundled, or a DefinitelyTyped
 * @types package), and its stable releases inside the window, flagging the ones that open a new semver-major line
 * (a new minor line below 1.0). Packages from one project form a family, ranked once under the most-downloaded name.
 * Output: frame.json, summarized in PROTOCOL.md.
 *
 *   npx tsx bench/heldout-v3/sampling/frame.ts [--cache <dir>]
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
export const WEEK = "2026-10-05:2026-10-11";
/** Releases strictly after claude-sonnet-4-5's cutoff and no later than the day before the frame was built. */
export const WINDOW = { after: "2025-07-31T23:59:59.999Z", until: "2026-10-15T23:59:59.999Z" };
/** Packages released, versioned and documented as one project. */
const FAMILIES: Record<string, string> = {
  "react-dom": "react",
  "@prisma/client": "prisma",
  playwright: "@playwright/test",
  "@langchain/core": "langchain",
  motion: "framer-motion",
};

interface Packument {
  error?: string;
  "dist-tags": Record<string, string>;
  time: Record<string, string>;
  versions: Record<string, { types?: string; typings?: string; exports?: unknown }>;
}

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

/** package.json files on GitHub that declare the package, from code search (cached; spaced for the rate limit). */
async function githubDeclarations(name: string, cacheFile: string): Promise<number> {
  if (existsSync(cacheFile)) return (JSON.parse(await readFile(cacheFile, "utf8")) as { total_count: number }).total_count;
  await new Promise((r) => setTimeout(r, 7000));
  const q = `"\\"${name}\\":" filename:package.json`;
  let stdout = "";
  for (let attempt = 1; ; attempt++) {
    try {
      ({ stdout } = await promisify(execFile)("gh", ["api", "-X", "GET", "search/code", "-f", `q=${q}`, "-q", "{total_count: .total_count, incomplete_results: .incomplete_results}"]));
      break;
    } catch (err) {
      // The search API allows 10 requests a minute; wait out a rate-limit error and try again.
      if (attempt >= 6 || !/rate limit/i.test(String((err as { stderr?: string }).stderr))) throw err;
      await new Promise((r) => setTimeout(r, 65_000));
    }
  }
  await writeFile(cacheFile, JSON.stringify({ q, searchedAt: new Date().toISOString(), ...JSON.parse(stdout) }));
  return (JSON.parse(stdout) as { total_count: number }).total_count;
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { cache: { type: "string", default: join(HERE, "..", "..", ".work", "frame-cache") } } });
  const cache = values.cache!;
  await mkdir(cache, { recursive: true });
  const categoryOf = new Map<string, string>();
  let category = "";
  for (const l of (await readFile(join(HERE, "candidates.txt"), "utf8")).split("\n").map((x) => x.trim())) {
    const m = /^# category: (.+)$/.exec(l);
    if (m) category = m[1];
    else if (l && !l.startsWith("#")) categoryOf.set(l, category);
  }
  const rows = [];
  for (const [name, cat] of categoryOf) {
    const safe = name.replace("/", "__");
    const dl = (await fetchJson(`https://api.npmjs.org/downloads/point/${WEEK}/${name}`, join(cache, `${safe}.downloads.json`))) as { downloads: number };
    const declarations = await githubDeclarations(name, join(cache, `${safe}.github.json`));
    const doc = (await fetchJson(`https://registry.npmjs.org/${name}`, join(cache, `${safe}.packument.json`))) as Packument;
    const latest = doc["dist-tags"].latest;
    const m = doc.versions[latest] ?? {};
    const bundledTypes = name === "typescript" || !!(m.types || m.typings || hasTypesCondition(m.exports));
    const dt = `@types/${name.startsWith("@") ? name.slice(1).replace("/", "__") : name}`;
    const definitelyTyped = !bundledTypes && !((await fetchJson(`https://registry.npmjs.org/${dt}`, join(cache, `${dt.replace("/", "__")}.packument.json`), true)) as Packument).error;
    const ordered = Object.keys(doc.versions).filter(stable).filter((v) => doc.time[v]).sort((p, q) => (doc.time[p] < doc.time[q] ? -1 : 1));
    const inWindow = ordered.filter((v) => doc.time[v] > WINDOW.after && doc.time[v] <= WINDOW.until);
    // A release opens a new line when no earlier stable release is on that line or a newer one (backports don't).
    const newLines = inWindow.filter((v) => {
      const earlier = ordered.slice(0, ordered.indexOf(v));
      return earlier.length > 0 && !earlier.some((p) => line(p) === line(v) || newer(p, v));
    });
    rows.push({
      name,
      category: cat,
      family: FAMILIES[name] ?? name,
      githubDeclarations: declarations,
      downloads: dl.downloads,
      latest,
      latestPublished: doc.time[latest],
      types: bundledTypes ? "bundled" : definitelyTyped ? dt : null,
      stableReleasesInWindow: inWindow.length,
      newMajorLinesInWindow: newLines.map((v) => `${v} (${doc.time[v].slice(0, 10)})`),
    });
    process.stderr.write(`${name} `);
  }
  rows.sort((a, b) => b.githubDeclarations - a.githubDeclarations);
  await writeFile(join(HERE, "frame.json"), JSON.stringify({ week: WEEK, window: WINDOW, rows }, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(`frame: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
