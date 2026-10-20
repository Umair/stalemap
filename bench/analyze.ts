/**
 * Analysis for the held-out runs, as fixed in bench/heldout/PROTOCOL.md, bench/heldout-v2/PROTOCOL.md and
 * bench/heldout-v3/PROTOCOL.md (written before results).
 *
 *   npx tsx bench/analyze.ts bench/results/<dir> [--suite heldout|heldout-v2|heldout-v3] [--out bench/heldout/RESULTS.md]
 *
 * The suite defaults to the one the run IDs name. heldout-v3 has its own analysis (analyzeV3 below): a two-level
 * bootstrap, one primary comparison and Bonferroni-adjusted secondaries.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

interface Row {
  runId?: string;
  model?: string;
  task: string;
  arm: string;
  mode: string;
  rep: number;
  pass: boolean;
  staleFinal: boolean;
  staleFirstEdit: boolean | null;
  deprecatedFinal: boolean;
  costUsd: number | null;
  durationMs: number | null;
  turns: number | null;
  context7Calls: number;
  guardFindings?: number;
  isError: boolean;
  // Recorded by run.ts since sharded runs; absent in earlier results.
  limitRetries?: number;
  guardMs?: (number | null)[];
  guardTimeouts?: number;
  guardIncomplete?: number;
  context7Errors?: number;
  context7Connected?: boolean | null;
}

const ARMS = ["alone", "context7", "stalemap-guard", "context7-stalemap"];
/** [A, B, note]: A − B. The first suite's comparisons. */
type Comparison = [string, string, string?];
const COMPARISONS: Comparison[] = [
  ["stalemap-guard", "alone"],
  ["stalemap-guard", "context7"],
  ["context7-stalemap", "context7"],
  ["context7", "alone"],
];
/** heldout-v2's decision rule adds both arms vs stalemap alone; context7 vs alone isn't part of it. */
const COMPARISONS_V2: Comparison[] = [
  ["stalemap-guard", "alone"],
  ["stalemap-guard", "context7"],
  ["context7-stalemap", "context7"],
  ["context7-stalemap", "stalemap-guard"],
  ["context7", "alone", "exploratory"],
];
const SUITES = ["heldout", "heldout-v2", "heldout-v3", "heldout-v4"];
/** The suite a session belongs to, from its run id (as bench/run.ts names them). */
const suiteOfRunId = (runId: string | undefined) =>
  runId === undefined
    ? "unknown"
    : runId.startsWith("heldout-v4.")
      ? "heldout-v4"
      : runId.startsWith("heldout-v3.")
      ? "heldout-v3"
      : runId.startsWith("heldout-v2.")
        ? "heldout-v2"
        : runId.startsWith("heldout.")
          ? "heldout"
          : "dev";

/** Small seeded PRNG (mulberry32) so the intervals are reproducible. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const median = (xs: number[]) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (x: number) => `${Math.round(100 * x)}%`;

function passRate(rows: Row[]): number {
  return rows.length ? rows.filter((r) => r.pass).length / rows.length : NaN;
}

/** Mean per-task difference in pass rate (A − B) with a 95% bootstrap interval over tasks. */
function compare(rows: Row[], a: string, b: string, tasks: string[]): { diff: number; lo: number; hi: number; n: number } {
  const per = tasks
    .map((t) => {
      const ra = rows.filter((r) => r.task === t && r.arm === a);
      const rb = rows.filter((r) => r.task === t && r.arm === b);
      return ra.length && rb.length ? passRate(ra) - passRate(rb) : undefined;
    })
    .filter((x): x is number => x !== undefined);
  if (!per.length) return { diff: NaN, lo: NaN, hi: NaN, n: 0 };
  const rand = rng(20261016);
  const boots: number[] = [];
  for (let i = 0; i < 10000; i++) boots.push(mean(Array.from({ length: per.length }, () => per[Math.floor(rand() * per.length)])));
  boots.sort((x, y) => x - y);
  return { diff: mean(per), lo: boots[249], hi: boots[9749], n: per.length };
}

function verdict(c: { lo: number; hi: number }): string {
  if (!Number.isFinite(c.lo)) return "–";
  return c.lo > 0 ? "**win**" : c.hi < 0 ? "**loss**" : "tie";
}

const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN;
};

/** Per-arm counts of what high concurrency can do to a run, and a one-line summary for the top. */
function loadSafety(rows: Row[]): { summary: string; table: string[] } {
  const sum = (rs: Row[], f: (r: Row) => number) => rs.reduce((s, r) => s + f(r), 0);
  const arms = ARMS.filter((a) => rows.some((r) => r.arm === a));
  const table = [
    "## Load safety",
    "",
    "Sessions that hit a plan or API limit were discarded and re-run. Guard times are wall times of the post-edit hook as Claude Code ran it; the guard gives up on a file after 25 s (no findings shown) and Claude Code kills the hook at 60 s.",
    "",
    "| arm | sessions | limit retries | guard runs | guard median / p90 / max | guard timeouts (60 s) | guard gave up (25 s) | Context7 tool errors | Context7 not connected |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const a of arms) {
    const rs = rows.filter((r) => r.arm === a);
    const ms = rs.flatMap((r) => r.guardMs ?? []).map((x) => x ?? Infinity);
    const sec = (x: number) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)}s` : "none");
    const c7 = rs.filter((r) => r.context7Connected !== null && r.context7Connected !== undefined);
    table.push(
      `| ${a} | ${rs.length} | ${sum(rs, (r) => r.limitRetries ?? 0)} | ${ms.length} | ${ms.length ? `${sec(quantile(ms, 0.5))} / ${sec(quantile(ms, 0.9))} / ${sec(Math.max(...ms))}` : "–"} | ${ms.length ? sum(rs, (r) => r.guardTimeouts ?? 0) : "–"} | ${ms.length ? sum(rs, (r) => r.guardIncomplete ?? 0) : "–"} | ${c7.length ? sum(rs, (r) => r.context7Errors ?? 0) : "–"} | ${c7.length ? c7.filter((r) => !r.context7Connected).length : "–"} |`,
    );
  }
  const problems = [
    [sum(rows, (r) => r.guardTimeouts ?? 0), "guard hook timeouts"],
    [sum(rows, (r) => r.guardIncomplete ?? 0), "guard runs that gave up"],
    [sum(rows, (r) => r.context7Errors ?? 0), "Context7 tool errors"],
    [rows.filter((r) => r.context7Connected === false).length, "sessions without Context7"],
  ].filter(([n]) => (n as number) > 0);
  const retries = sum(rows, (r) => r.limitRetries ?? 0);
  const summary = problems.length
    ? `**Load check:** ${problems.map(([n, what]) => `${n} ${what}`).join(", ")}; see Load safety for the arms they hit. ${retries} limit retries.`
    : `Load check: no guard timeouts, no guard runs that gave up, no Context7 errors; ${retries} limit retries (see Load safety).`;
  return { summary, table };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, suite: { type: "string" }, "no-context7": { type: "boolean" } } });
  const dir = positionals[0];
  if (!dir) throw new Error("usage: analyze.ts <results dir> [--suite heldout|heldout-v2|heldout-v3] [--out file]");
  const rows = (await readFile(join(dir, "results.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l) as Row);
  // One results folder is one suite: refuse to pool sessions from different suites.
  const found = new Map<string, number>();
  for (const r of rows) found.set(suiteOfRunId(r.runId), (found.get(suiteOfRunId(r.runId)) ?? 0) + 1);
  const suite = values.suite ?? [...found.keys()][0];
  if (!SUITES.includes(suite)) throw new Error(`--suite must be one of ${SUITES.join(", ")} (this folder has ${[...found.keys()].join(", ")} sessions)`);
  if (found.size > 1 || !found.has(suite)) throw new Error(`${dir} mixes suites or doesn't match --suite ${suite}: ${[...found].map(([s, n]) => `${n} ${s}`).join(", ")} sessions`);
  if (suite === "heldout-v3") return analyzeV3(rows, dir, values.out, V3);
  if (suite === "heldout-v4") {
    // The public report leaves the Context7 arms out (PROTOCOL.md: exploratory, never part of a claim).
    const kept = values["no-context7"] ? rows.filter((r) => !r.arm.startsWith("context7")) : rows;
    return analyzeV3(kept, dir, values.out, V4);
  }
  const comparisons = suite === "heldout-v2" ? COMPARISONS_V2 : COMPARISONS;
  const comparisonTable = (rs: Row[], ts: string[]) => {
    const lines = ["| comparison | pass-rate difference | 95% interval | verdict |", "|---|---|---|---|"];
    for (const [a, b, note] of comparisons) {
      const c = compare(rs, a, b, ts);
      if (!c.n) continue;
      lines.push(`| ${a} vs ${b}${note ? ` (${note})` : ""} | ${c.diff >= 0 ? "+" : ""}${Math.round(100 * c.diff)} pts | [${Math.round(100 * c.lo)}, ${Math.round(100 * c.hi)}] | ${verdict(c)} |`);
    }
    return lines;
  };
  const tasksRoot = join(dir, "..", "..", suite, "tasks");
  const scenarioOf = new Map<string, string>();
  const kindOf = new Map<string, string>();
  for (const t of await readdir(tasksRoot)) {
    const meta = JSON.parse(await readFile(join(tasksRoot, t, "meta.json"), "utf8")) as { scenario?: string; kind?: string };
    scenarioOf.set(t, meta.scenario ?? "?");
    if (meta.kind) kindOf.set(t, meta.kind);
  }
  const tasks = [...new Set(rows.map((r) => r.task))].sort();
  const reps = Math.max(...rows.map((r) => r.rep));
  const errors = rows.filter((r) => r.isError).length;

  const out: string[] = [
    suite === "heldout-v3" ? "# Held-out v3 benchmark results" : suite === "heldout-v2" ? "# Held-out v2 benchmark results" : "# Held-out benchmark results",
    "",
    `\`claude-sonnet-4-5\` · ${rows.length} sessions · ${tasks.length} tasks · up to ${reps} repetitions per cell · ${errors} sessions ended in an error (scored as failures).`,
    "Analysis as pre-registered in [PROTOCOL.md](PROTOCOL.md). Differences are per-task means of pass rates with 95% bootstrap intervals over tasks; a win or loss needs the interval to exclude zero.",
    "",
  ];
  // run.ts records the stalemap build of every invocation; say which build(s) these sessions used.
  if (existsSync(join(dir, "build.jsonl"))) {
    const builds = (await readFile(join(dir, "build.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l) as { commit: string; dirty: boolean; distSha256: string | null });
    const distinct = [...new Set(builds.map((b) => `\`${b.commit.slice(0, 7)}\`${b.dirty ? " with uncommitted changes" : ""}, dist \`${b.distSha256?.slice(0, 12) ?? "missing"}\``))];
    out.splice(out.length - 1, 0, distinct.length === 1 ? `stalemap build: ${distinct[0]}.` : `**Mixed stalemap builds** across ${builds.length} invocations: ${distinct.join("; ")}.`);
  }

  // Load safety: limits, a slow guard or a throttled Context7 would hit some arms and not others.
  const load = rows.some((r) => r.limitRetries !== undefined) ? loadSafety(rows) : undefined;
  if (load) out.splice(out.length - 1, 0, load.summary);

  for (const mode of ["oneshot", "checks", "both"]) {
    const rs = mode === "both" ? rows : rows.filter((r) => r.mode === mode);
    if (!rs.length) continue;
    out.push(`## ${mode === "oneshot" ? "One-shot (file tools only)" : mode === "checks" ? "With checks (can run npm test)" : "Both modes pooled"}`, "");
    out.push("| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | Context7 calls | guard corrections |", "|---|---|---|---|---|---|---|---|---|---|");
    for (const arm of ARMS) {
      const r = rs.filter((x) => x.arm === arm);
      if (!r.length) continue;
      const first = r.filter((x) => x.staleFirstEdit !== null);
      out.push(
        `| ${arm} | ${r.filter((x) => x.pass).length}/${r.length} (${pct(passRate(r))}) | ${pct(r.filter((x) => x.staleFinal).length / r.length)} | ${first.length ? pct(first.filter((x) => x.staleFirstEdit).length / first.length) : "–"} | ${pct(r.filter((x) => x.deprecatedFinal).length / r.length)} | $${median(r.map((x) => x.costUsd ?? NaN)).toFixed(3)} | ${Math.round(median(r.map((x) => x.durationMs ?? NaN)) / 1000)}s | ${median(r.map((x) => x.turns ?? NaN))} | ${(r.reduce((s, x) => s + x.context7Calls, 0) / r.length).toFixed(1)} | ${(r.reduce((s, x) => s + (x.guardFindings ?? 0), 0) / r.length).toFixed(1)} |`,
      );
    }
    out.push("", ...comparisonTable(rs, tasks));
    out.push("");
  }

  out.push("## By scenario (both modes)", "", `| scenario | ${ARMS.join(" | ")} |`, `|---|${ARMS.map(() => "---").join("|")}|`);
  for (const sc of [...new Set(tasks.map((t) => scenarioOf.get(t)!))].sort()) {
    const rs = rows.filter((r) => scenarioOf.get(r.task) === sc);
    out.push(`| ${sc} | ${ARMS.map((a) => {
      const r = rs.filter((x) => x.arm === a);
      return r.length ? `${r.filter((x) => x.pass).length}/${r.length}` : "–";
    }).join(" | ")} |`);
  }
  // heldout-v2 tags each task with whether its stale code still type-checks; break the results down by that too.
  const kinds = [...new Set(tasks.map((t) => kindOf.get(t)).filter((k): k is string => !!k))].sort();
  if (kinds.length) {
    out.push("", "## By kind (both modes)", "", `| kind | tasks | ${ARMS.join(" | ")} |`, `|---|---|${ARMS.map(() => "---").join("|")}|`);
    for (const k of kinds) {
      const rs = rows.filter((r) => kindOf.get(r.task) === k);
      out.push(`| ${k} | ${tasks.filter((t) => kindOf.get(t) === k).length} | ${ARMS.map((a) => {
        const r = rs.filter((x) => x.arm === a);
        return r.length ? `${r.filter((x) => x.pass).length}/${r.length} (${pct(passRate(r))})` : "–";
      }).join(" | ")} |`);
    }
    for (const k of kinds) {
      const ks = tasks.filter((t) => kindOf.get(t) === k);
      const rs = rows.filter((r) => kindOf.get(r.task) === k);
      out.push("", `Comparisons on \`${k}\` tasks only, both modes pooled:`, "", ...comparisonTable(rs, ks));
    }
  }
  out.push("", "## By task (passes out of runs, one-shot / checks)", "", `| task | scenario | ${ARMS.join(" | ")} |`, `|---|---|${ARMS.map(() => "---").join("|")}|`);
  for (const t of tasks) {
    const cell = (a: string) =>
      ["oneshot", "checks"]
        .map((m) => {
          const r = rows.filter((x) => x.task === t && x.arm === a && x.mode === m);
          return r.length ? `${r.filter((x) => x.pass).length}/${r.length}` : "–";
        })
        .join(" · ");
    out.push(`| ${t} | ${scenarioOf.get(t)} | ${ARMS.map(cell).join(" | ")} |`);
  }
  if (load) out.push("", ...load.table);
  const md = out.join("\n") + "\n";
  if (values.out) await writeFile(values.out, md);
  process.stdout.write(md);
}

// ---------------------------------------------------------------------------
// heldout-v3 (bench/heldout-v3/PROTOCOL.md, "Analysis")

const ARMS_V3 = ["alone", "context7", "stalemap-guard", "context7-stalemap", "oracle", "tsc-hook", "stalemap-full"];
/** Exploratory arms: outside the decision rule and the completeness check. `stalemap-full` came after the v3 run. */
const EXPLORATORY_ARMS_V3 = ["oracle", "tsc-hook", "stalemap-full"];
/** The pre-registered model; a run on another model is the exploratory second-model run. */
const MODEL_V3 = "claude-sonnet-4-5";
const PRIMARY_V3: Comparison = ["stalemap-guard", "alone"];
/** Each judged at 1 − 0.05/3 (Bonferroni over the three). */
const SECONDARY_V3: Comparison[] = [
  ["stalemap-guard", "context7"],
  ["context7-stalemap", "context7"],
  ["context7-stalemap", "stalemap-guard"],
];
const EXPLORATORY_V3: Comparison[] = [
  ["context7", "alone"],
  ["context7-stalemap", "alone"],
  ["oracle", "alone"],
  // A plain `tsc --noEmit` hook after each edit, no notes: what the guard adds over the free alternative.
  ["tsc-hook", "alone"],
  ["stalemap-guard", "tsc-hook"],
  // Notes, guard and stalemap's own search tool: against the docs MCP and the plain tsc hook.
  ["stalemap-full", "context7"],
  ["stalemap-full", "tsc-hook"],
  ["stalemap-full", "stalemap-guard"],
];
const REPS_V3 = 3;
const BOOTSTRAPS_V3 = 10_000;
const SEED_V3 = 20261016;

/** What a v3-style suite's analysis compares, per model. */
interface SuiteAnalysis {
  name: string;
  title: string;
  arms: string[];
  /** Outside the decision rule and the completeness check. */
  exploratoryArms: string[];
  /** Models the protocol names, with that model's primary (if any) and secondary comparisons. */
  models: Record<string, { primary?: Comparison; secondary: Comparison[]; label: string }>;
  /** How many secondary comparisons the Bonferroni level is split over, across all models. */
  secondaryCount: number;
  exploratory: Comparison[];
  reps: number;
  seed: number;
}

const V3: SuiteAnalysis = {
  name: "heldout-v3",
  title: "Held-out v3 benchmark results",
  arms: ARMS_V3,
  exploratoryArms: EXPLORATORY_ARMS_V3,
  models: { [MODEL_V3]: { primary: PRIMARY_V3, secondary: SECONDARY_V3, label: "the pre-registered model" } },
  secondaryCount: 3,
  exploratory: EXPLORATORY_V3,
  reps: REPS_V3,
  seed: SEED_V3,
};

// heldout-v4 (bench/heldout-v4/PROTOCOL.md): stalemap-full is the product; Context7 arms are exploratory.
const V4: SuiteAnalysis = {
  name: "heldout-v4",
  title: "Held-out v4 benchmark results",
  arms: ["alone", "stalemap-full", "tsc-hook", "oracle", "context7", "context7-stalemap"],
  exploratoryArms: ["oracle", "context7", "context7-stalemap"],
  models: {
    "claude-sonnet-5-5": { primary: ["stalemap-full", "alone"], secondary: [["stalemap-full", "tsc-hook"]], label: "the primary model" },
    "claude-sonnet-4-5": { secondary: [["stalemap-full", "alone"], ["stalemap-full", "tsc-hook"]], label: "the secondary model" },
  },
  secondaryCount: 3,
  exploratory: [
    ["tsc-hook", "alone"],
    ["oracle", "alone"],
    ["oracle", "stalemap-full"],
    ["context7", "alone"],
    ["stalemap-full", "context7"],
    ["context7-stalemap", "context7"],
    ["context7-stalemap", "stalemap-full"],
  ],
  reps: 3,
  seed: 20261020,
};

interface Estimate {
  diff: number;
  lo: number;
  hi: number;
  n: number;
}

/**
 * Mean per-task difference in pass rate (A − B), with a two-level bootstrap interval: each replicate resamples tasks
 * with replacement, then, within each drawn task, resamples that task's runs with replacement inside every
 * arm × mode cell (so each replicate keeps the design's balance of modes). `level` is the two-sided coverage.
 */
export function twoLevel(rows: Row[], a: string, b: string, tasks: string[], level = 0.95, boots = BOOTSTRAPS_V3, seed = SEED_V3): Estimate {
  type Cells = number[][]; // per mode: 0/1 outcomes
  const cells = (t: string, arm: string): Cells =>
    [...new Set(rows.filter((r) => r.task === t && r.arm === arm).map((r) => r.mode))].sort().map((m) => rows.filter((r) => r.task === t && r.arm === arm && r.mode === m).map((r) => (r.pass ? 1 : 0)));
  const used = tasks.map((t) => ({ t, A: cells(t, a), B: cells(t, b) })).filter((x) => x.A.length && x.B.length);
  if (!used.length) return { diff: NaN, lo: NaN, hi: NaN, n: 0 };
  const rate = (c: Cells) => c.flat().reduce((s, x) => s + x, 0) / c.flat().length;
  const rand = rng(seed);
  const resampledRate = (c: Cells) => {
    let passes = 0, runs = 0;
    for (const cell of c) for (let i = 0; i < cell.length; i++, runs++) passes += cell[Math.floor(rand() * cell.length)];
    return passes / runs;
  };
  const stats: number[] = [];
  for (let i = 0; i < boots; i++) {
    let sum = 0;
    for (let k = 0; k < used.length; k++) {
      const x = used[Math.floor(rand() * used.length)];
      sum += resampledRate(x.A) - resampledRate(x.B);
    }
    stats.push(sum / used.length);
  }
  stats.sort((x, y) => x - y);
  const tail = (1 - level) / 2;
  return {
    diff: mean(used.map((x) => rate(x.A) - rate(x.B))),
    lo: stats[Math.floor(tail * boots)],
    hi: stats[Math.ceil((1 - tail) * boots) - 1],
    n: used.length,
  };
}

async function analyzeV3(rows: Row[], dir: string, outFile: string | undefined, cfg: SuiteAnalysis): Promise<void> {
  const models = [...new Set(rows.map((r) => r.model ?? "?"))];
  if (models.length > 1) throw new Error(`${dir} mixes models (${models.join(", ")}); analyze each model's sessions separately`);
  const plan = cfg.models[models[0]];
  const PRIMARY = plan?.primary;
  const SECONDARY = plan?.secondary ?? [];
  const secondaryLevel = 1 - 0.05 / cfg.secondaryCount;
  const boot = (rs: Row[], a: string, b: string, ts: string[], level = 0.95) => twoLevel(rs, a, b, ts, level, BOOTSTRAPS_V3, cfg.seed);
  const tasksRoot = join(dir, "..", "..", cfg.name, "tasks");
  const meta = new Map<string, { kind?: string; changeType?: string; package?: string; scenario?: string }>();
  for (const t of await readdir(tasksRoot, { withFileTypes: true })) {
    if (t.isDirectory()) meta.set(t.name, JSON.parse(await readFile(join(tasksRoot, t.name, "meta.json"), "utf8")));
  }
  const frozen = [...meta.keys()].sort();
  const tasks = [...new Set(rows.map((r) => r.task))].sort();
  const arms = cfg.arms.filter((a) => rows.some((r) => r.arm === a));
  const modes = ["oneshot", "checks"].filter((m) => rows.some((r) => r.mode === m));
  const errors = rows.filter((r) => r.isError).length;
  const fmt = (x: number) => `${x >= 0 ? "+" : ""}${(100 * x).toFixed(1)} pts`;
  const ci = (e: Estimate) => `[${(100 * e.lo).toFixed(1)}, ${(100 * e.hi).toFixed(1)}]`;
  const row = (label: string, e: Estimate, level: number) => `| ${label} | ${e.n} | ${fmt(e.diff)} | ${ci(e)} (${Math.round(1000 * level) / 10}%) | ${verdict(e)} |`;
  const header = ["| comparison | tasks | pass-rate difference | interval | verdict |", "|---|---|---|---|---|"];

  // Completeness: every frozen task × confirmatory arm × mode needs REPS_V3 sessions for the run to count as complete,
  // including arms with no sessions at all.
  const short: string[] = [];
  for (const t of frozen) for (const a of cfg.arms.filter((x) => !cfg.exploratoryArms.includes(x))) for (const m of ["oneshot", "checks"]) {
    const n = rows.filter((r) => r.task === t && r.arm === a && r.mode === m).length;
    if (n < cfg.reps) short.push(`${t}/${a}/${m}: ${n}`);
  }
  const extra = tasks.filter((t) => !meta.has(t));
  const out: string[] = [
    `# ${cfg.title}`,
    "",
    `\`${models[0]}\` · ${rows.length} sessions · ${tasks.length} of ${frozen.length} frozen tasks · ${errors} sessions ended in an error (scored as failures).`,
    ...(plan ? [`\`${models[0]}\` is ${plan.label} in the protocol.`, ""] : [`**Exploratory run** (\`${models[0]}\` isn't a model the protocol names): no claim rests on it.`, ""]),
    "Analysis as pre-registered in [PROTOCOL.md](PROTOCOL.md): per-task means of pass rates, both modes pooled unless a section says otherwise, with two-level bootstrap intervals (tasks, then runs within each task; 10,000 replicates). A win or loss needs the interval to exclude zero.",
    "",
    short.length || extra.length
      ? `**Incomplete run:** ${short.length} task × arm × mode cells have fewer than ${cfg.reps} sessions${short.length ? ` (${short.slice(0, 8).join("; ")}${short.length > 8 ? "; …" : ""})` : ""}${extra.length ? `; sessions for tasks not in the frozen suite: ${extra.join(", ")}` : ""}. The confirmatory analysis below is reported as incomplete.`
      : `Complete: every frozen task has ${cfg.reps} sessions per arm and mode.`,
    "",
  ];
  if (existsSync(join(dir, "build.jsonl"))) {
    const builds = (await readFile(join(dir, "build.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l) as { commit: string; dirty: boolean; distSha256: string | null });
    const distinct = [...new Set(builds.map((b) => `\`${b.commit.slice(0, 7)}\`${b.dirty ? " with uncommitted changes" : ""}, dist \`${b.distSha256?.slice(0, 12) ?? "missing"}\``))];
    out.push(distinct.length === 1 ? `stalemap build: ${distinct[0]}.` : `**Mixed stalemap builds** across ${builds.length} invocations: ${distinct.join("; ")}.`, "");
  }

  const pooled = rows.filter((r) => meta.has(r.task));
  const P = PRIMARY ? boot(pooled, PRIMARY[0], PRIMARY[1], frozen) : undefined;
  if (PRIMARY && P) {
    out.push(
      "## Primary comparison",
      "",
      ...header,
      row(`${PRIMARY[0]} vs ${PRIMARY[1]}`, P, 0.95),
      "",
      `Decision: ${P.lo > 0 ? "**stalemap helps** (the interval excludes zero)." : P.hi < 0 ? "**stalemap hurts** (the interval is below zero)." : "**not shown**: the interval includes zero."}`,
      "",
    );
  }
  if (SECONDARY.length) {
    out.push(
      `## Secondary comparisons (Bonferroni over ${cfg.secondaryCount}: ${Math.round(1000 * secondaryLevel) / 10}% intervals)`,
      "",
      ...header,
      ...SECONDARY.map(([a, b]) => row(`${a} vs ${b}`, boot(pooled, a, b, frozen, secondaryLevel), secondaryLevel)),
      "",
    );
  }
  out.push(
    "## Exploratory",
    "",
    "Not part of the decision rule. 95% intervals.",
    "",
    ...header,
    ...cfg.exploratory.filter(([a, b]) => arms.includes(a) && arms.includes(b)).map(([a, b]) => row(`${a} vs ${b}`, boot(pooled, a, b, frozen), 0.95)),
    "",
  );

  for (const mode of [...modes, "both"]) {
    const rs = mode === "both" ? pooled : pooled.filter((r) => r.mode === mode);
    out.push(`### ${mode === "oneshot" ? "One-shot (file tools only)" : mode === "checks" ? "With checks (can run npm test)" : "Both modes pooled"}`, "");
    out.push("| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | Context7 calls | guard corrections |", "|---|---|---|---|---|---|---|---|---|---|");
    for (const arm of arms) {
      const r = rs.filter((x) => x.arm === arm);
      if (!r.length) continue;
      const first = r.filter((x) => x.staleFirstEdit !== null);
      out.push(
        `| ${arm} | ${r.filter((x) => x.pass).length}/${r.length} (${pct(passRate(r))}) | ${pct(r.filter((x) => x.staleFinal).length / r.length)} | ${first.length ? pct(first.filter((x) => x.staleFirstEdit).length / first.length) : "–"} | ${pct(r.filter((x) => x.deprecatedFinal).length / r.length)} | $${median(r.map((x) => x.costUsd ?? NaN)).toFixed(3)} | ${Math.round(median(r.map((x) => x.durationMs ?? NaN)) / 1000)}s | ${median(r.map((x) => x.turns ?? NaN))} | ${(r.reduce((s, x) => s + x.context7Calls, 0) / r.length).toFixed(1)} | ${(r.reduce((s, x) => s + (x.guardFindings ?? 0), 0) / r.length).toFixed(1)} |`,
      );
    }
    if (mode !== "both") out.push("", ...header, ...[...(PRIMARY ? [PRIMARY] : []), ...SECONDARY].map(([a, b]) => row(`${a} vs ${b}`, boot(rs, a, b, frozen), 0.95)));
    out.push("");
  }

  // Breakdowns by task attributes, each with the primary comparison on that subset (exploratory).
  const headline = PRIMARY ?? SECONDARY[0] ?? (["stalemap-full", "alone"] as Comparison);
  for (const [title, key] of [["kind", "kind"], ["change type", "changeType"], ["package", "package"], ["scenario", "scenario"]] as const) {
    const groups = [...new Set(frozen.map((t) => meta.get(t)?.[key] ?? "?"))].sort();
    out.push(`### By ${title} (exploratory)`, "", `| ${title} | tasks | ${arms.join(" | ")} | ${headline[0]} vs ${headline[1]} |`, `|---|---|${arms.map(() => "---").join("|")}|---|`);
    for (const g of groups) {
      const ts = frozen.filter((t) => (meta.get(t)?.[key] ?? "?") === g);
      const rs = pooled.filter((r) => ts.includes(r.task));
      const e = boot(rs, headline[0], headline[1], ts);
      out.push(`| ${g} | ${ts.length} | ${arms.map((a) => {
        const r = rs.filter((x) => x.arm === a);
        return r.length ? `${r.filter((x) => x.pass).length}/${r.length} (${pct(passRate(r))})` : "–";
      }).join(" | ")} | ${e.n ? `${fmt(e.diff)} ${ci(e)}` : "–"} |`);
    }
    out.push("");
  }

  out.push("## By task (passes out of runs, one-shot · checks)", "", `| task | package | kind | ${arms.join(" | ")} |`, `|---|---|---|${arms.map(() => "---").join("|")}|`);
  for (const t of frozen) {
    const cell = (a: string) =>
      ["oneshot", "checks"].map((m) => {
        const r = pooled.filter((x) => x.task === t && x.arm === a && x.mode === m);
        return r.length ? `${r.filter((x) => x.pass).length}/${r.length}` : "–";
      }).join(" · ");
    out.push(`| ${t} | ${meta.get(t)?.package ?? "?"} | ${meta.get(t)?.kind ?? "?"} | ${arms.map(cell).join(" | ")} |`);
  }
  const md = out.join("\n") + "\n";
  if (outFile) await writeFile(outFile, md);
  process.stdout.write(md);
}

main().catch((err) => {
  process.stderr.write(`analyze: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
