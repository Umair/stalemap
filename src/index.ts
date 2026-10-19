import { relative, resolve } from "node:path";
import { analyzeDependency, analyzeDeps, selectDeps, type PackageReport } from "./analyze.js";
import { defaultTarget, depsHash, readBlock } from "./block.js";
import { DEFAULT_LLM_MODEL } from "./llm.js";
import { resolveModel, type ResolvedModel } from "./models.js";
import { precomputedEnabled } from "./precomputed.js";
import { loadProject, type Project, type ProjectDep } from "./project.js";
import { buildPackageNotes, renderBlock, type RenderResult } from "./render.js";
import { readTsconfig } from "./tsoptions.js";
import { isoDate, mapLimit } from "./util.js";

export type { PackageReport } from "./analyze.js";
export type { ResolvedModel } from "./models.js";
export type { RenderResult } from "./render.js";
export { applyBlock, removeBlock } from "./block.js";
export { guardFile, guardMessage } from "./guard.js";
export { TOOL_VERSION } from "./util.js";

export interface StalemapOptions {
  cwd: string;
  model?: string;
  cutoff?: string;
  /** Days before the cutoff treated as unknown (default 30). */
  margin?: number;
  target?: string;
  all?: boolean;
  llm?: boolean;
  llmModel?: string;
  /** Token budget for the block (default 1800). */
  budget?: number;
  /**
   * The post-edit guard is on, so the notes go first to changes it can't catch (defaults, behavior,
   * moved settings) and removals that fail to compile come after. Default: detected from the agent
   * setup in the project (see `guardInstalled`).
   */
  guard?: boolean;
  perPackage?: number;
  useCache?: boolean;
  /** Generate verified before/after examples (needs `claude` or Anthropic credentials). */
  examples?: boolean;
  /** Add notes from the packages' upgrade guides (needs `claude` or Anthropic credentials, like examples). */
  guides?: boolean;
  llmProvider?: string;
  /**
   * Use precomputed reports for popular packages when they match (default true; off with
   * STALEMAP_NO_PRECOMPUTED=1). Only package names are sent to fetch them.
   */
  precomputed?: boolean;
}

export const DEFAULTS = { margin: 30, budget: 1800, perPackage: 8, llmModel: DEFAULT_LLM_MODEL };

export interface Prepared {
  project: Project;
  model: ResolvedModel;
  selected: ProjectDep[];
  hash: string;
  target: string;
}

/** Everything that needs only local files (plus the cached model catalog). */
export async function prepareProject(opts: StalemapOptions): Promise<Prepared> {
  const cwd = resolve(opts.cwd);
  const project = await loadProject(cwd);
  const model = await resolveModel({ model: opts.model, cutoff: opts.cutoff, cwd, useCache: opts.useCache ?? true });
  const selected = selectDeps(project.deps, !!opts.all);
  const hash = depsHash(
    model.id,
    isoDate(model.cutoff),
    opts.margin ?? DEFAULTS.margin,
    selected.map((d) => ({ name: d.name, pinned: d.pinned ?? d.range })),
  );
  const target = opts.target ? resolve(cwd, opts.target) : defaultTarget(cwd);
  return { project, model, selected, hash, target };
}

export interface RunResult extends Prepared {
  reports: PackageReport[];
  rendered: RenderResult;
}

/** The full pipeline: resolve, analyze every selected dependency, render the block. */
export async function runStalemap(opts: StalemapOptions, preparedAlready?: Prepared): Promise<RunResult> {
  const prepared = preparedAlready ?? (await prepareProject(opts));
  const perPackage = opts.perPackage ?? DEFAULTS.perPackage;
  const guides = opts.guides ? { provider: await llmProvider(opts.llmProvider), model: opts.llmModel ?? DEFAULTS.llmModel } : undefined;
  const reports = await analyzeDeps(prepared.selected, {
    model: prepared.model,
    marginDays: opts.margin ?? DEFAULTS.margin,
    useCache: opts.useCache ?? true,
    llm: !!opts.llm,
    llmModel: opts.llmModel ?? DEFAULTS.llmModel,
    maxNotesPerPackage: perPackage,
    concurrency: 4,
    // With --all nothing may import a package yet: diff all of its entry points, test helpers included.
    allSubpaths: !!opts.all,
    // Examples are compiled against the downloaded packages, and guides read each package's
    // packument, so both need live analysis.
    precomputed: (opts.precomputed ?? true) && !opts.examples && !opts.guides && precomputedEnabled(),
    guides,
  });
  if (opts.examples) {
    const { examplesFor } = await import("./examples.js");
    const provider = await llmProvider(opts.llmProvider);
    await mapLimit(reports.filter((r) => r.status === "changed"), 3, async (r) => {
      r.examples = await examplesFor(r, provider, opts.llmModel ?? DEFAULTS.llmModel, opts.useCache ?? true);
    });
  }
  const tsconfig = readTsconfig(prepared.project.root);
  if (tsconfig) for (const r of reports) if (r.name === "typescript" && r.status === "changed") r.tsconfig = tsconfig;
  const guard = opts.guard ?? (await import("./setup.js").then((m) => m.guardInstalled(prepared.project.root)));
  const { measuredVerdicts } = await import("./probe/run.js");
  const measured = await measuredVerdicts(prepared.project.root, prepared.model.id);
  const rendered = renderBlock(
    reports,
    {
      model: prepared.model,
      hash: prepared.hash,
      budgetTokens: opts.budget ?? DEFAULTS.budget,
      maxBulletsPerPackage: perPackage,
      generatedAt: new Date(),
      measured,
      guard,
    },
    4,
  );
  return { ...prepared, reports, rendered };
}

export type BlockStatus = "missing" | "stale" | "fresh";

/** Offline freshness check of the block in the target file. */
export async function checkBlock(opts: StalemapOptions): Promise<{ status: BlockStatus; target: string; targetName: string; model: ResolvedModel }> {
  const { hash, target, model } = await prepareProject(opts);
  const existing = await readBlock(target);
  const targetName = relative(resolve(opts.cwd), target) || target;
  const status: BlockStatus = !existing.block ? "missing" : existing.hash === hash ? "fresh" : "stale";
  return { status, target, targetName, model };
}

/** Changes in a single package between what `model` knew and `version` (default: latest). */
export async function packageChanges(opts: {
  name: string;
  version?: string;
  model?: string;
  cutoff?: string;
  cwd?: string;
  margin?: number;
  usedNames?: string[];
  useCache?: boolean;
  maxNotes?: number;
  precomputed?: boolean;
}): Promise<{ report: PackageReport; model: ResolvedModel; markdown: string }> {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const model = await resolveModel({ model: opts.model, cutoff: opts.cutoff, cwd, useCache: opts.useCache ?? true });
  const dep: ProjectDep = {
    name: opts.name,
    range: opts.version ?? "latest",
    kind: "dependencies",
    ...(opts.usedNames?.length ? { usage: { subpaths: new Map([[".", new Set(opts.usedNames)]]), files: new Set<string>() } } : {}),
  };
  const report = await analyzeDependency(dep, {
    model,
    marginDays: opts.margin ?? DEFAULTS.margin,
    useCache: opts.useCache ?? true,
    llm: false,
    llmModel: DEFAULTS.llmModel,
    maxNotesPerPackage: opts.maxNotes ?? 8,
    concurrency: 1,
    precomputed: (opts.precomputed ?? true) && precomputedEnabled(),
  });
  return { report, model, markdown: describeReport(report, model, opts.maxNotes ?? 8) };
}

/** A standalone markdown description of one package report (no token budget). */
export function describeReport(r: PackageReport, model: ResolvedModel, maxNotes: number): string {
  const cutoff = isoDate(model.cutoff);
  switch (r.status) {
    case "known":
      return `\`${r.name}@${r.pinned}\` is not newer than what \`${model.id}\` saw (latest release by its cutoff, ${cutoff} minus margin: ${r.baseline?.version}). No notes.`;
    case "new":
      return `\`${r.name}\` was first released after \`${model.id}\`'s training cutoff (${cutoff}). The model has no training data on it: read its docs or type declarations before using it.`;
    case "unresolved":
    case "error":
      return `Couldn't analyze \`${r.name}\`: ${r.error ?? r.status}.`;
  }
  const notes = buildPackageNotes(r, 6).bullets.slice(0, maxNotes);
  const head = `**${r.name}** ${r.baseline!.version} → ${r.pinned}${r.major ? " (major)" : ""}: changes since \`${model.id}\`'s training cutoff (${cutoff})`;
  if (!notes.length) return `${head}\n- No notable API changes found in the type declarations or changelog.`;
  return [head, ...notes.map((b) => `- ${b.text} [${b.tag}]`)].join("\n");
}

/** Model access for examples: headless Claude Code on the user's plan, or the Anthropic API. */
export async function llmProvider(name?: string) {
  const p = await import("./probe/providers.js");
  const choice = name ?? (await hasClaudeCli() ? "claude-code" : "anthropic");
  return choice === "claude-code" ? p.claudeCodeProvider() : p.anthropicProvider();
}

async function hasClaudeCli(): Promise<boolean> {
  const { execFile } = await import("node:child_process");
  return new Promise((done) => execFile("claude", ["--version"], { timeout: 5000 }, (err) => done(!err)));
}
