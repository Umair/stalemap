import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import semver from "semver";
import YAML from "yaml";
import { addConfigUsage } from "./configusage.js";
import { debug, readJson } from "./util.js";

export type DepKind = "dependencies" | "devDependencies" | "optionalDependencies" | "peerDependencies";

export interface DepUsage {
  /** Subpath ("." or "./server") → names imported from it ("default", "*" or export names). */
  subpaths: Map<string, Set<string>>;
  /** Project-relative files that import the package. */
  files: Set<string>;
}

export interface ProjectDep {
  name: string;
  range: string;
  kind: DepKind;
  pinned?: string;
  pinnedSource?: string;
  usage?: DepUsage;
}

export interface Project {
  root: string;
  name?: string;
  deps: ProjectDep[];
  lockfile?: string;
  filesScanned: number;
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const KINDS: DepKind[] = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

export async function loadProject(root: string): Promise<Project> {
  const pkg = await readJson<PackageJson>(join(root, "package.json"));
  if (!pkg) throw new Error(`No package.json in ${root}`);

  const byName = new Map<string, ProjectDep>();
  for (const kind of KINDS) {
    for (const [name, range] of Object.entries(pkg[kind] ?? {})) {
      if (byName.has(name)) continue; // dependencies win over devDependencies, etc.
      if (name.startsWith("@types/")) continue;
      // Local and aliased packages have no registry history to diff. (pnpm `catalog:` ranges are kept: the lockfile has the version.)
      if (/^(workspace:|file:|link:|portal:|git|https?:|npm:|github:)/.test(range)) continue;
      byName.set(name, { name, range, kind });
    }
  }
  const deps = [...byName.values()];

  const lock = await loadLockVersions(root, deps);
  for (const dep of deps) {
    const installed = await readJson<PackageJson>(join(root, "node_modules", dep.name, "package.json"));
    if (installed?.version && semver.valid(installed.version)) {
      dep.pinned = installed.version;
      dep.pinnedSource = "node_modules";
    } else if (lock.versions.has(dep.name)) {
      dep.pinned = lock.versions.get(dep.name);
      dep.pinnedSource = lock.file;
    }
  }

  const depNames = new Set(deps.map((d) => d.name));
  const { usage, filesScanned } = await scanUsage(root, depNames);
  await addConfigUsage(root, depNames, usage);
  for (const dep of deps) dep.usage = usage.get(dep.name);

  return { root, name: pkg.name, deps, lockfile: lock.file, filesScanned };
}

// ---------------------------------------------------------------------------
// Lockfiles

interface LockVersions {
  file?: string;
  versions: Map<string, string>;
}

const leadingSemver = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const m = v.match(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  return m && semver.valid(m[0]) ? m[0] : undefined;
};

async function readTextIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

export async function loadLockVersions(root: string, deps: ProjectDep[]): Promise<LockVersions> {
  const versions = new Map<string, string>();

  const npmLock = await readJson<{
    packages?: Record<string, { version?: string }>;
    dependencies?: Record<string, { version?: string }>;
  }>(join(root, "package-lock.json"));
  if (npmLock) {
    for (const d of deps) {
      const v = npmLock.packages?.[`node_modules/${d.name}`]?.version ?? npmLock.dependencies?.[d.name]?.version;
      const sv = leadingSemver(v);
      if (sv) versions.set(d.name, sv);
    }
    return { file: "package-lock.json", versions };
  }

  const pnpmText = await readTextIfExists(join(root, "pnpm-lock.yaml"));
  if (pnpmText) {
    const doc = YAML.parse(pnpmText) as Record<string, any>;
    const importer = doc?.importers?.["."] ?? doc;
    for (const d of deps) {
      for (const kind of ["dependencies", "devDependencies", "optionalDependencies"]) {
        const entry = importer?.[kind]?.[d.name];
        const sv = leadingSemver(typeof entry === "object" ? entry?.version : entry);
        if (sv) {
          versions.set(d.name, sv);
          break;
        }
      }
    }
    return { file: "pnpm-lock.yaml", versions };
  }

  const yarnText = await readTextIfExists(join(root, "yarn.lock"));
  if (yarnText) {
    const specToVersion = parseYarnLock(yarnText);
    for (const d of deps) {
      const v =
        specToVersion.get(`${d.name}@${d.range}`) ??
        specToVersion.get(`${d.name}@npm:${d.range}`) ??
        // Fall back to any entry for the package (single-version lockfiles are the common case).
        [...specToVersion.entries()].find(([spec]) => spec.slice(0, spec.lastIndexOf("@")) === d.name)?.[1];
      const sv = leadingSemver(v);
      if (sv) versions.set(d.name, sv);
    }
    return { file: "yarn.lock", versions };
  }

  const bunText = await readTextIfExists(join(root, "bun.lock"));
  if (bunText) {
    try {
      // bun.lock is JSON with trailing commas.
      const doc = JSON.parse(bunText.replace(/,(\s*[}\]])/g, "$1")) as { packages?: Record<string, unknown[]> };
      for (const d of deps) {
        const entry = doc.packages?.[d.name];
        const id = Array.isArray(entry) ? String(entry[0]) : "";
        const sv = leadingSemver(id.slice(id.lastIndexOf("@") + 1));
        if (sv) versions.set(d.name, sv);
      }
    } catch (err) {
      debug(`couldn't parse bun.lock: ${(err as Error).message}`);
    }
    return { file: "bun.lock", versions };
  }

  return { versions };
}

/** Handles yarn v1 (`version "1.2.3"`) and berry (`version: 1.2.3`) entries. */
export function parseYarnLock(text: string): Map<string, string> {
  const out = new Map<string, string>();
  let specs: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    if (!line.startsWith(" ") && line.trimEnd().endsWith(":")) {
      specs = line
        .trimEnd()
        .slice(0, -1)
        .split(/,\s*/)
        .map((s) => s.replace(/^"|"$/g, "").trim());
      continue;
    }
    const m = line.match(/^\s+version:?\s+"?([^"\s]+)"?/);
    if (m && specs.length) {
      for (const s of specs) out.set(s, m[1]);
      specs = [];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Import scan

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".output", "coverage",
  ".turbo", ".vercel", ".cache", "vendor", ".yarn", ".pnpm-store", "storybook-static", "tmp", ".expo",
]);
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?|vue|svelte|astro|mdx|css|scss)$/;
const MAX_FILES = 20000;
const MAX_FILE_BYTES = 1_000_000;

async function* walk(dir: string, root: string, counter: { n: number }): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (counter.n >= MAX_FILES) return;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name) || (e.name.startsWith(".") && e.name !== ".storybook")) continue;
      yield* walk(full, root, counter);
    } else if (e.isFile() && SOURCE_EXT.test(e.name) && !e.name.endsWith(".d.ts")) {
      counter.n++;
      yield full;
    }
  }
}

/** Split an import specifier into package name and subpath, e.g. "next/server" → ["next", "./server"]. */
export function splitSpecifier(spec: string): [string, string] | undefined {
  if (/^(\.|\/|#|~|node:|https?:|data:|virtual:|bun:)/.test(spec)) return undefined;
  const parts = spec.split("/");
  if (spec.startsWith("@")) {
    if (parts.length < 2 || parts[0] === "@") return undefined;
    const name = `${parts[0]}/${parts[1]}`;
    return [name, parts.length > 2 ? "./" + parts.slice(2).join("/") : "."];
  }
  return [parts[0], parts.length > 1 ? "./" + parts.slice(1).join("/") : "."];
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

function memberAccesses(local: string, fileText: string): Set<string> {
  const re = new RegExp(`(?<![\\w$.])${local.replace(/\$/g, "\\$")}\\.([A-Za-z_$][\\w$]*)`, "g");
  const out = new Set<string>();
  for (const m of fileText.matchAll(re)) out.add(m[1]);
  return out;
}

/** Props passed to an imported component: `<Image quality={90} fill />` gives `quality`, `fill`. */
function jsxProps(local: string, fileText: string): Set<string> {
  const out = new Set<string>();
  if (!/^[A-Z]/.test(local)) return out;
  // Up to the tag's end; an arrow function's `>` cuts it short, which only loses later props.
  const re = new RegExp(`<${local.replace(/\$/g, "\\$")}(?![\\w$.])([^>]*)>`, "g");
  for (const m of fileText.matchAll(re)) {
    const attrs = m[1].replace(/\{[^{}]*\}|"[^"]*"|'[^']*'/g, " ");
    for (const a of attrs.matchAll(/(?:^|\s)([A-Za-z_$][\w$]*)(?=\s*=|\s|\/?$)/g)) out.add(a[1]);
  }
  return out;
}

/**
 * Names imported by an import/export clause such as `React, { useState, type FC as F }`.
 * Member accesses on imported bindings are recorded too: `z.object(...)` adds "z.object", and so are
 * props passed to an imported component: `<Image quality={90} />` adds "default.quality".
 */
export function parseImportClause(clause: string, fileText: string): string[] {
  const names: string[] = [];
  const bind = (imported: string, local: string) => {
    names.push(imported);
    for (const m of memberAccesses(local, fileText)) names.push(`${imported}.${m}`);
    for (const p of jsxProps(local, fileText)) names.push(`${imported}.${p}`);
  };
  let rest = clause.trim().replace(/^type\s+/, "");
  const ns = rest.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (ns) {
    // `import * as ns`: each `ns.foo` is a use of the export `foo`.
    const used = memberAccesses(ns[1], fileText);
    names.push(...(used.size ? used : ["*"]));
    rest = rest.replace(ns[0], "");
  } else if (rest.startsWith("*")) {
    names.push("*");
    rest = rest.slice(1);
  }
  const braces = rest.match(/\{([\s\S]*?)\}/);
  if (braces) {
    for (const part of braces[1].split(",")) {
      const p = part.trim().replace(/^type\s+/, "");
      if (!p) continue;
      const [orig, alias] = p.split(/\s+as\s+/).map((s) => s.trim());
      if (IDENT.test(orig) || orig === "default") bind(orig, alias && IDENT.test(alias) ? alias : orig);
    }
    rest = rest.replace(braces[0], "");
  }
  const def = rest.replace(/,/g, " ").trim();
  if (def && IDENT.test(def)) bind("default", def);
  return names;
}

export async function scanUsage(
  root: string,
  depNames: Set<string>,
): Promise<{ usage: Map<string, DepUsage>; filesScanned: number }> {
  const usage = new Map<string, DepUsage>();
  const counter = { n: 0 };

  const record = (spec: string, names: string[], file: string) => {
    const split = splitSpecifier(spec);
    if (!split || !depNames.has(split[0])) return;
    const [name, subpath] = split;
    let u = usage.get(name);
    if (!u) usage.set(name, (u = { subpaths: new Map(), files: new Set() }));
    let set = u.subpaths.get(subpath);
    if (!set) u.subpaths.set(subpath, (set = new Set()));
    for (const n of names) set.add(n);
    u.files.add(file);
  };

  for await (const full of walk(root, root, counter)) {
    try {
      if ((await stat(full)).size > MAX_FILE_BYTES) continue;
    } catch {
      continue;
    }
    const text = await readFile(full, "utf8");
    const file = relative(root, full);

    if (/\.(s?css)$/.test(full)) {
      for (const m of text.matchAll(/@(?:import|plugin|config|reference|use)\s+(?:url\()?['"]([^'"\n]+)['"]/g)) record(m[1], [], file);
      continue;
    }
    for (const m of text.matchAll(/\b(?:import|export)\s+(?:type\s+)?([^'";]*?)\s*from\s*['"]([^'"\n]+)['"]/g)) {
      record(m[2], parseImportClause(m[1], text), file);
    }
    for (const m of text.matchAll(/\bimport\s*['"]([^'"\n]+)['"]/g)) record(m[1], [], file);
    for (const m of text.matchAll(/\b(?:import|require)\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g)) record(m[1], [], file);
  }
  return { usage, filesScanned: counter.n };
}
