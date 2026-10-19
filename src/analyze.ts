import semver from "semver";
import { collectChangelog, type ChangelogResult } from "./changelog.js";
import { CONFIG_FILE_PACKAGES } from "./configusage.js";
import { guideNotes, type GuideNote } from "./guides.js";
import { LlmUnavailableError, summarizeWithClaude, type LlmNote } from "./llm.js";
import type { ResolvedModel } from "./models.js";
import type { Provider } from "./probe/providers.js";
import { precomputedReport } from "./precomputed.js";
import type { ProjectDep } from "./project.js";
import { chooseBaseline, fetchPackageFiles, getPackument, isMajorBump, resolveRange, type Baseline } from "./registry.js";
import type { TsconfigInfo } from "./tsoptions.js";
import { analyzeTypes, type TypeAnalysis } from "./typediff.js";
import { debug, info, isoDate, mapLimit } from "./util.js";

export type PackageStatus = "changed" | "known" | "new" | "unresolved" | "error";

export interface PackageReport {
  name: string;
  status: PackageStatus;
  pinned?: string;
  pinnedSource?: string;
  baseline?: Baseline;
  major: boolean;
  used: boolean;
  usedNames: string[];
  files: string[];
  /** Entry points the project imports besides the root (`next/image`). */
  entries?: string[];
  types?: TypeAnalysis;
  changelog?: ChangelogResult;
  llmNotes?: LlmNote[];
  /** Notes from the package's upgrade guides (guides.ts), with `--guides`. */
  guideNotes?: GuideNote[];
  /** Verified before/after examples, keyed by note text (see examples.ts). */
  examples?: Record<string, { before: string; after: string }>;
  /** Built from a precomputed shard instead of downloaded packages (see precomputed.ts). */
  precomputed?: boolean;
  /** The project's tsconfig.json, on TypeScript's report: its deprecated options get a note. */
  tsconfig?: TsconfigInfo;
  error?: string;
}

export interface AnalyzeOptions {
  model: ResolvedModel;
  marginDays: number;
  useCache: boolean;
  llm: boolean;
  llmModel: string;
  maxNotesPerPackage: number;
  concurrency: number;
  /** Use a precomputed report when one matches (default false). */
  precomputed?: boolean;
  /** Diff every public entry point, test helpers included, not only the imported ones (`--all`). */
  allSubpaths?: boolean;
  /** Add notes from upgrade guides. Without a provider, only notes already cached are used (the guard). */
  guides?: { provider?: Provider; model: string };
  /**
   * Report exports that moved to another entry point (default true). Precomputed shards don't store
   * what this needs, so the precompute build turns it off to replay exactly.
   */
  movedExports?: boolean;
}

/**
 * Packages that are usually configured rather than imported (CLI, config file, CSS),
 * so the import scan alone would miss them.
 */
const CONFIG_DRIVEN = new Set([
  "next", "tailwindcss", "vite", "astro", "nuxt", "@sveltejs/kit", "svelte", "expo", "prisma",
  "@prisma/client", "drizzle-kit", "eslint", "wrangler", "vitest", "@playwright/test", "storybook", "typescript",
]);

export function selectDeps(deps: ProjectDep[], all: boolean): ProjectDep[] {
  if (all) return deps;
  // Packages with a known config file are used when it (or an import) exists: configusage.ts records
  // that as usage. The rest of CONFIG_DRIVEN can't be detected that way, so they're always checked.
  return deps.filter((d) => d.usage || (CONFIG_DRIVEN.has(d.name) && !CONFIG_FILE_PACKAGES.has(d.name)));
}

export function usedNamesOf(dep: ProjectDep): string[] {
  const names = new Set<string>();
  for (const set of dep.usage?.subpaths.values() ?? []) {
    for (const n of set) {
      if (n === "*" || n === "default") continue;
      names.add(n.includes(".") ? n.slice(n.indexOf(".") + 1) : n);
    }
  }
  return [...names];
}

let llmDisabledReason: string | undefined;

export async function analyzeDependency(dep: ProjectDep, opts: AnalyzeOptions): Promise<PackageReport> {
  const base: PackageReport = {
    name: dep.name,
    status: "unresolved",
    pinned: dep.pinned,
    pinnedSource: dep.pinnedSource,
    major: false,
    used: !!dep.usage,
    usedNames: usedNamesOf(dep),
    files: [...(dep.usage?.files ?? [])].slice(0, 12),
    entries: [...(dep.usage?.subpaths.keys() ?? [])].filter((s) => s !== ".").map((s) => `${dep.name}/${s.slice(2)}`),
  };
  try {
    if (opts.precomputed) {
      const r = await precomputedReport(dep, base, opts, !!opts.allSubpaths);
      if (r) return r.status === "changed" ? { ...r, llmNotes: await llmPass(r, opts) } : r;
    }
    const p = await getPackument(dep.name, opts.useCache);
    const pinned = dep.pinned ?? resolveRange(p, dep.range);
    if (!pinned || !p.versions[pinned]) return { ...base, status: "unresolved", error: `can't resolve ${dep.range}` };
    base.pinned = pinned;
    base.pinnedSource ??= "package.json range";

    const baseline = chooseBaseline(p, opts.model.cutoff, opts.marginDays);
    if (!baseline) return { ...base, status: "new" };
    base.baseline = baseline;
    if (semver.lte(pinned, baseline.version)) return { ...base, status: "known" };

    base.major = isMajorBump(baseline.version, pinned);
    const [baseDir, nextDir] = await Promise.all([
      fetchPackageFiles(p, baseline.version, opts.useCache),
      fetchPackageFiles(p, pinned, opts.useCache),
    ]);
    const types = await analyzeTypes(dep.name, baseDir, baseline.version, nextDir, pinned, dep.usage?.subpaths, !!opts.allSubpaths, opts.movedExports !== false);
    const changelog = await collectChangelog({
      p,
      pkgDir: nextDir,
      from: baseline.version,
      to: pinned,
      usedNames: new Set(base.usedNames),
      useCache: opts.useCache,
    });
    const report: PackageReport = { ...base, status: "changed", types, changelog };
    if (opts.guides) {
      report.guideNotes = await guideNotes({
        p,
        from: baseline.version,
        to: pinned,
        known: types.changes.filter((c) => c.used && c.kind !== "added").map((c) => c.detail),
        provider: opts.guides.provider,
        model: opts.guides.model,
        max: 20,
        useCache: opts.useCache,
      });
    }
    return { ...report, llmNotes: await llmPass(report, opts) };
  } catch (err) {
    return { ...base, status: "error", error: (err as Error).message };
  }
}

/** The optional Claude summary of a changed package. */
async function llmPass(r: PackageReport, opts: AnalyzeOptions): Promise<LlmNote[] | undefined> {
  const { types, changelog } = r;
  if (!opts.llm || llmDisabledReason || !types || !changelog) return undefined;
  if (!types.changes.some((c) => c.kind !== "added") && !changelog.items.length) return undefined;
  try {
    return await summarizeWithClaude(
      {
        name: r.name,
        from: r.baseline!.version,
        to: r.pinned!,
        cutoff: isoDate(opts.model.cutoff),
        usedNames: r.usedNames,
        typeChanges: types.changes,
        changelog: changelog.items.slice(0, 80),
        maxNotes: opts.maxNotesPerPackage,
      },
      opts.llmModel,
      opts.useCache,
    );
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      // Packages run in parallel; report the first failure only.
      if (!llmDisabledReason) info(`  ! Skipping the Claude summary pass: ${err.message}`);
      llmDisabledReason = err.message;
    } else {
      debug(`Claude summary for ${r.name} failed: ${(err as Error).message}`);
    }
    return undefined;
  }
}

export async function analyzeDeps(deps: ProjectDep[], opts: AnalyzeOptions): Promise<PackageReport[]> {
  let done = 0;
  return mapLimit(deps, opts.concurrency, async (dep) => {
    const started = Date.now();
    const r = await analyzeDependency(dep, opts);
    done++;
    const what =
      r.status === "changed"
        ? `${r.baseline!.version} → ${r.pinned}${r.precomputed ? " (precomputed)" : ""}`
        : r.status === "error" || r.status === "unresolved"
          ? `${r.status}: ${r.error ?? ""}`
          : r.status;
    debug(`[${done}/${deps.length}] ${dep.name} ${what} (${Date.now() - started}ms)`);
    return r;
  });
}
