import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describeReport, runStalemap } from "../index.js";
import type { ResolvedModel } from "../models.js";
import { packageRoot } from "../registry.js";
import { cacheDir, info, isoDate, mapLimit, readJson, sha256, writeJsonAtomic } from "../util.js";
import { extractCode, gradeCode, type Verdict } from "./grade.js";
import { ProviderUnavailableError, type Provider } from "./providers.js";
import { buildProbes, probePrompt, PROBE_SYSTEM, type Probe } from "./tasks.js";

export type Arm = "bare" | "notes";

export interface ProbeResult {
  probe: Probe;
  arm: Arm;
  verdict: Verdict | "error";
  findings: string[];
  touchedApi: boolean;
  code: string;
  error?: string;
}

export interface ModelProbeRun {
  model: string;
  cutoff: string;
  provider: string;
  ranAt: string;
  probes: number;
  results: ProbeResult[];
}

export interface ModelSpec {
  /** Model id as the provider knows it. */
  id: string;
  /** Training cutoff override (needed for models models.dev doesn't know, e.g. local ones). */
  cutoff?: string;
}

/** "qwen3:8b=2025-04" → { id: "qwen3:8b", cutoff: "2025-04" } */
export function parseModelSpecs(list: string): ModelSpec[] {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.*?)=(\d{4}(?:-\d{2}){0,2})$/);
      return m ? { id: m[1], cutoff: m[2] } : { id: s };
    });
}

async function cachedReply(provider: Provider, model: string, prompt: string, useCache: boolean): Promise<string> {
  const path = join(cacheDir(), "probe-replies", `${sha256(JSON.stringify([provider.name, model, PROBE_SYSTEM, prompt])).slice(0, 32)}.json`);
  if (useCache) {
    const hit = await readJson<{ reply: string }>(path);
    if (hit) return hit.reply;
  }
  const reply = await provider.complete(model, prompt);
  await writeJsonAtomic(path, { reply, at: new Date().toISOString() });
  return reply;
}

export interface ProbeOptions {
  cwd: string;
  models: ModelSpec[];
  provider?: Provider;
  arms: Arm[];
  maxProbes: number;
  includeUnused: boolean;
  concurrency: number;
  useCache: boolean;
  dryRun: boolean;
  margin?: number;
}

export interface DryRunProbe {
  model: string;
  probe: Probe;
  prompts: Record<Arm, string>;
}

export async function runProbes(opts: ProbeOptions): Promise<{ runs: ModelProbeRun[]; dry: DryRunProbe[] }> {
  const runs: ModelProbeRun[] = [];
  const dry: DryRunProbe[] = [];
  for (const spec of opts.models) {
    // Grading compiles against the downloaded packages, so analyze live.
    const analysis = await runStalemap({ cwd: opts.cwd, model: spec.id, cutoff: spec.cutoff, margin: opts.margin, useCache: opts.useCache, precomputed: false });
    const model: ResolvedModel = { ...analysis.model, id: spec.id };
    const probes = buildProbes(analysis.reports, opts.maxProbes, opts.includeUnused);
    const notesFor = new Map(
      analysis.reports.filter((r) => r.status === "changed").map((r) => [r.name, describeReport(r, model, 8)] as const),
    );
    info(`${spec.id}: ${probes.length} probe${probes.length === 1 ? "" : "s"} (cutoff ${isoDate(model.cutoff)})`);

    if (opts.dryRun || !opts.provider) {
      for (const p of probes) {
        dry.push({ model: spec.id, probe: p, prompts: { bare: probePrompt(p), notes: probePrompt(p, notesFor.get(p.pkg)) } });
      }
      continue;
    }

    const jobs = probes.flatMap((p) => opts.arms.map((arm) => ({ p, arm })));
    let done = 0;
    const results = await mapLimit(jobs, opts.concurrency, async ({ p, arm }): Promise<ProbeResult> => {
      const prompt = arm === "notes" ? probePrompt(p, notesFor.get(p.pkg)) : probePrompt(p);
      try {
        const reply = await cachedReply(opts.provider!, spec.id, prompt, opts.useCache);
        const grade = await gradeCode(extractCode(reply), { packageRoot: packageRoot(p.pkg, p.version), ...p.target });
        return { probe: p, arm, verdict: grade.verdict, findings: grade.findings, touchedApi: grade.touchedApi, code: grade.code };
      } catch (err) {
        if (err instanceof ProviderUnavailableError) throw err; // no point trying the remaining probes
        return { probe: p, arm, verdict: "error", findings: [], touchedApi: false, code: "", error: (err as Error).message };
      } finally {
        done++;
        if (done % 5 === 0 || done === jobs.length) info(`  ${done}/${jobs.length} answered`);
      }
    });
    const run: ModelProbeRun = {
      model: spec.id,
      cutoff: isoDate(model.cutoff),
      provider: opts.provider.name,
      ranAt: new Date().toISOString(),
      probes: probes.length,
      results,
    };
    await saveRun(opts.cwd, run);
    runs.push(run);
  }
  if (runs.length) await saveSummary(opts.cwd, runs);
  return { runs, dry };
}

export function probesDir(cwd: string): string {
  return join(resolve(cwd), ".stalemap", "probes");
}

const fileSafe = (model: string) => model.replace(/[^\w.-]+/g, "_");

async function saveRun(cwd: string, run: ModelProbeRun): Promise<void> {
  await mkdir(probesDir(cwd), { recursive: true });
  await writeFile(join(probesDir(cwd), `${fileSafe(run.model)}.json`), JSON.stringify(run, null, 2) + "\n");
}

export async function loadRun(cwd: string, model: string): Promise<ModelProbeRun | undefined> {
  return readJson<ModelProbeRun>(join(probesDir(cwd), `${fileSafe(model)}.json`));
}

export interface ArmStats {
  graded: number;
  stale: number;
  rate: number;
}

export function armStats(run: ModelProbeRun, arm: Arm): ArmStats {
  const graded = run.results.filter((r) => r.arm === arm && (r.verdict === "stale" || r.verdict === "current"));
  const stale = graded.filter((r) => r.verdict === "stale").length;
  return { graded: graded.length, stale, rate: graded.length ? stale / graded.length : 0 };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function summarize(runs: ModelProbeRun[]): string {
  const lines = [
    "| model | cutoff | probes | stale without notes | stale with notes |",
    "|---|---|---|---|---|",
    ...runs.map((r) => {
      const bare = armStats(r, "bare");
      const notes = armStats(r, "notes");
      const fmt = (s: ArmStats) => (s.graded ? `${s.stale}/${s.graded} (${pct(s.rate)})` : "–");
      return `| \`${r.model}\` | ${r.cutoff} | ${r.probes} | ${fmt(bare)} | ${fmt(notes)} |`;
    }),
  ];
  return lines.join("\n");
}

async function saveSummary(cwd: string, runs: ModelProbeRun[]): Promise<void> {
  const detail = runs
    .map((run) => {
      const rows = new Map<string, Partial<Record<Arm, ProbeResult>>>();
      for (const r of run.results) rows.set(r.probe.id, { ...rows.get(r.probe.id), [r.arm]: r });
      const mark = (r?: ProbeResult) => (!r ? "–" : r.verdict === "stale" ? "✗ stale" : r.verdict === "current" ? "✓" : r.verdict === "avoided" ? "avoided API" : r.verdict);
      return [
        `### \`${run.model}\``,
        "",
        "| package | change | without notes | with notes |",
        "|---|---|---|---|",
        ...[...rows.values()].map((row) => {
          const p = (row.bare ?? row.notes)!.probe;
          return `| \`${p.pkg}@${p.version}\` | ${p.detail.replace(/\|/g, "\\|").slice(0, 120)} | ${mark(row.bare)} | ${mark(row.notes)} |`;
        }),
      ].join("\n");
    })
    .join("\n\n");
  await writeFile(
    join(probesDir(cwd), "summary.md"),
    `# stalemap probes\n\nGenerated ${new Date().toISOString().slice(0, 10)}. A probe asks the model to write code for the pinned version and type-checks it against that version's published declarations.\n\n${summarize(runs)}\n\n${detail}\n`,
  );
}

/** Verdicts from the last probe run for `model`, keyed like the notes: package|subpath|symbol|kind. */
export async function measuredVerdicts(cwd: string, model: string): Promise<Map<string, Verdict> | undefined> {
  const run = await loadRun(cwd, model);
  if (!run) return undefined;
  const out = new Map<string, Verdict>();
  for (const r of run.results) {
    if (r.arm !== "bare" || (r.verdict !== "stale" && r.verdict !== "current")) continue;
    out.set(`${r.probe.pkg}|${r.probe.subpath}|${r.probe.symbol}|${r.probe.kind}`, r.verdict);
  }
  return out;
}
