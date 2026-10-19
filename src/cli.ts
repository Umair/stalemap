#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import type { PackageReport } from "./analyze.js";
import { applyBlock, defaultTarget, readBlock, removeBlock, sameBlock } from "./block.js";
import { checkBlock, DEFAULTS, prepareProject, runStalemap } from "./index.js";
import { DEFAULT_LLM_MODEL } from "./llm.js";
import { searchModels } from "./models.js";
import type { Project } from "./project.js";
import { TOOL_VERSION, info, isoDate, setLogLevel } from "./util.js";

const HELP = `stalemap ${TOOL_VERSION}
Tell your coding agent which dependencies changed after its training cutoff.

Usage
  stalemap [scan]      Show what changed and preview the block (default)
  stalemap sync        Write the block into AGENTS.md / CLAUDE.md
  stalemap setup --agent <cursor|codex|opencode|claude>
                       Set up an agent in this project: the notes, the MCP server and
                       the post-edit guard (re-running changes nothing; see --dry-run)
  stalemap check       Exit 1 if the block is missing or out of date (for CI)
  stalemap remove      Remove the block
  stalemap models <q>  Search known models and their training cutoffs
  stalemap mcp         Run as an MCP server over stdio (tools: search_changes,
                       package_changes, project_changes, check_notes)
  stalemap search <q>  Search what changed in this project's dependencies (--package <name>)
  stalemap guard <f>   Type-check files and report APIs that changed after the cutoff
  stalemap hook session-start | post-edit [--agent <name>] | record-edit | stop
                       Agent hooks: notes at session start (Claude Code), the guard after
                       edits (Claude Code's payload, or --agent cursor|codex|opencode);
                       record-edit and stop (--agent cursor) send the guard's findings as
                       a follow-up when the agent stops
  stalemap probe       Measure which notes each model actually gets wrong (see below)

Options
  --model <id>         Model your agent uses (default: detected from Claude Code,
                       Codex, OpenCode or Gemini CLI settings, or $ANTHROPIC_MODEL)
  --cutoff <date>      Training cutoff to use instead of a model (YYYY-MM[-DD])
  --margin <days>      Treat releases this close to the cutoff as unknown (default 30)
  --target <file>      File to write (default AGENTS.md, or CLAUDE.md if only that exists)
  --all                Check every direct dependency, not just imported ones
  --guard, --no-guard  Rank the notes for an agent that runs the post-edit guard: what still
                       type-checks (defaults, behavior, moved settings) before removals the
                       guard reports anyway (default: on when a hook or the plugin runs it)
  --llm                Summarize each package's changes with Claude (needs Anthropic
                       credentials; results are cached)
  --llm-model <id>     Model for --llm (default ${DEFAULT_LLM_MODEL})
  --examples           Add before/after examples, compiled against the pinned
                       versions (via \`claude -p\`, or the Anthropic API with --llm-provider)
  --guides             Add notes from the packages' upgrade guides: changed defaults, moved
                       config options, renamed files (via \`claude -p\` or --llm-provider)
  --llm-provider <p>   claude-code (default when \`claude\` is installed) or anthropic
  --budget <tokens>    Size limit for the block (default 1800)
  --per-package <n>    Max notes per package (default 8)
  --json               Machine-readable output (scan)
  --dry-run            Show what sync or setup would write without writing
  --agent <name>       Agent for setup and hook post-edit: cursor, codex, opencode, claude
  -y, --yes            Don't ask before writing
  --cwd <dir>          Project directory (default: current directory)
  --no-cache           Ignore cached registry, changelog and summary data
  --no-precomputed     Analyze every package locally instead of using precomputed
                       reports for popular ones (or set STALEMAP_NO_PRECOMPUTED=1)
  -v, --verbose        Log progress details
  -q, --quiet          Only print results and errors
  -h, --help           Show this help

Probe options
  --models <a,b>       Models to probe; add =YYYY-MM for a custom cutoff (qwen3:8b=2025-04)
  --provider <p>       anthropic (API), openai (any OpenAI-compatible endpoint, e.g.
                       Ollama) or claude-code (headless \`claude -p\`, your Claude plan)
  --base-url <url>     Endpoint for --provider openai (default http://localhost:11434/v1)
  --api-key-env <var>  Env var holding the key for --provider openai (default OPENAI_API_KEY)
  --max-probes <n>     Probes per model (default 12); each runs once per arm
  --arms <list>        bare,notes (default both): without and with the notes in the prompt
  --include-unused     Also probe high-impact changes to APIs the project doesn't import
  --dry-run            Print the probes and prompts without calling any model
`;

interface Options {
  agent?: string;
  examples: boolean;
  guides: boolean;
  llmProvider?: string;
  models?: string;
  provider?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  maxProbes: number;
  arms: string;
  includeUnused: boolean;
  model?: string;
  cutoff?: string;
  margin: number;
  target?: string;
  all: boolean;
  guard?: boolean;
  llm: boolean;
  llmModel: string;
  budget: number;
  perPackage: number;
  json: boolean;
  dryRun: boolean;
  yes: boolean;
  cwd: string;
  useCache: boolean;
  precomputed: boolean;
  /** `search --package <name>`. */
  package?: string;
}

function parse(argv: string[]): { command: string; rest: string[]; opts: Options } {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      agent: { type: "string" },
      package: { type: "string" },
      model: { type: "string" },
      cutoff: { type: "string" },
      margin: { type: "string" },
      target: { type: "string" },
      all: { type: "boolean" },
      guard: { type: "boolean" },
      "no-guard": { type: "boolean" },
      llm: { type: "boolean" },
      "llm-model": { type: "string" },
      examples: { type: "boolean" },
      guides: { type: "boolean" },
      "llm-provider": { type: "string" },
      models: { type: "string" },
      provider: { type: "string" },
      "base-url": { type: "string" },
      "api-key-env": { type: "string" },
      "max-probes": { type: "string" },
      arms: { type: "string" },
      "include-unused": { type: "boolean" },
      budget: { type: "string" },
      "per-package": { type: "string" },
      json: { type: "boolean" },
      "dry-run": { type: "boolean" },
      yes: { type: "boolean", short: "y" },
      cwd: { type: "string" },
      "no-cache": { type: "boolean" },
      "no-precomputed": { type: "boolean" },
      verbose: { type: "boolean", short: "v" },
      quiet: { type: "boolean", short: "q" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean" },
    },
  });
  if (values.help) {
    process.stdout.write(HELP);
    process.exit(0);
  }
  if (values.version) {
    process.stdout.write(TOOL_VERSION + "\n");
    process.exit(0);
  }
  setLogLevel({ verbose: values.verbose, quiet: values.quiet || values.json });
  const int = (v: string | undefined, d: number, name: string) => {
    if (v === undefined) return d;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} must be a non-negative integer`);
    return n;
  };
  const [command = "scan", ...rest] = positionals;
  return {
    command,
    rest,
    opts: {
      agent: values.agent,
      examples: !!values.examples,
      guides: !!values.guides,
      llmProvider: values["llm-provider"],
      models: values.models,
      provider: values.provider,
      baseUrl: values["base-url"],
      apiKeyEnv: values["api-key-env"],
      maxProbes: int(values["max-probes"], 12, "max-probes"),
      arms: values.arms ?? "bare,notes",
      includeUnused: !!values["include-unused"],
      model: values.model,
      cutoff: values.cutoff,
      margin: int(values.margin, DEFAULTS.margin, "margin"),
      target: values.target,
      all: !!values.all,
      guard: values.guard ? true : values["no-guard"] ? false : undefined,
      llm: !!values.llm,
      llmModel: values["llm-model"] ?? process.env.STALEMAP_LLM_MODEL ?? DEFAULT_LLM_MODEL,
      budget: int(values.budget, DEFAULTS.budget, "budget"),
      perPackage: int(values["per-package"], DEFAULTS.perPackage, "per-package"),
      json: !!values.json,
      dryRun: !!values["dry-run"],
      yes: !!values.yes,
      cwd: resolve(values.cwd ?? process.cwd()),
      useCache: !values["no-cache"],
      precomputed: !values["no-precomputed"],
      package: values.package,
    },
  };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s + " " : s + " ".repeat(n - s.length);
}

function summaryLine(r: PackageReport): string {
  const t = r.types;
  const nonAdded = t?.changes.filter((c) => c.kind !== "added") ?? [];
  const usedCount = nonAdded.filter((c) => c.used).length;
  const parts: string[] = [];
  if (t?.noTypes) parts.push("no type declarations");
  else if (t) parts.push(`types: ${nonAdded.length} change${nonAdded.length === 1 ? "" : "s"}${usedCount ? ` (${usedCount} in APIs you import)` : ""}`);
  if (r.changelog?.source) parts.push(`${r.changelog.source}: ${r.changelog.versions.length} release${r.changelog.versions.length === 1 ? "" : "s"}`);
  else parts.push("no changelog found");
  if (r.llmNotes) parts.push(`${r.llmNotes.length} summary note${r.llmNotes.length === 1 ? "" : "s"}`);
  if (r.precomputed) parts.push("precomputed");
  return parts.join(" · ");
}

function printReport(project: Project, reports: PackageReport[], selectedCount: number, opts: Options): void {
  const changed = reports.filter((r) => r.status === "changed");
  const w = Math.max(10, ...changed.map((r) => r.name.length)) + 2;
  const vw = Math.max(10, ...changed.map((r) => `${r.baseline!.version} → ${r.pinned}`.length)) + 2;
  info(
    `Scanned ${project.filesScanned} source files; checked ${selectedCount} of ${project.deps.length} dependencies` +
      (opts.all ? "." : " (imported or config-driven; --all for every one)."),
  );
  if (changed.length) {
    info("\nChanged since the model's training data:");
    for (const r of changed) {
      info(`  ${pad(r.name, w)}${pad(`${r.baseline!.version} → ${r.pinned}`, vw)}${pad(r.major ? "major" : "", 7)}${summaryLine(r)}`);
    }
  }
  const known = reports.filter((r) => r.status === "known");
  if (known.length) info(`\nKnown to the model (pinned ≤ last version before cutoff): ${known.map((r) => r.name).join(", ")}`);
  const fresh = reports.filter((r) => r.status === "new");
  if (fresh.length) info(`First released after the cutoff: ${fresh.map((r) => `${r.name}@${r.pinned}`).join(", ")}`);
  const failed = reports.filter((r) => r.status === "error" || r.status === "unresolved");
  if (failed.length) info(`Skipped: ${failed.map((r) => `${r.name} (${r.error ?? r.status})`).join("; ")}`);
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return /^y(es)?$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

async function run(): Promise<number> {
  const { command, rest, opts } = parse(process.argv.slice(2));

  if (command === "hook") {
    const { sessionStartHook, postEditHook, cursorRecordEditHook, cursorStopHook, HOOK_AGENTS } = await import("./hook.js");
    const agent = opts.agent ?? "claude";
    if (!(HOOK_AGENTS as readonly string[]).includes(agent)) throw new Error(`--agent must be one of ${HOOK_AGENTS.join(", ")}`);
    if (rest[0] === "session-start") await sessionStartHook(opts.cwd, opts.budget);
    else if (rest[0] === "post-edit") await postEditHook(opts.cwd, agent as (typeof HOOK_AGENTS)[number]);
    else if ((rest[0] === "record-edit" || rest[0] === "stop") && agent !== "cursor") throw new Error(`stalemap hook ${rest[0]} is for --agent cursor`);
    else if (rest[0] === "record-edit") await cursorRecordEditHook(opts.cwd);
    else if (rest[0] === "stop") await cursorStopHook(opts.cwd);
    else throw new Error("usage: stalemap hook session-start | post-edit [--agent <name>] | record-edit --agent cursor | stop --agent cursor");
    return 0;
  }

  if (command === "setup") return setupCommand(opts, rest);

  if (command === "guard") {
    if (!rest.length) throw new Error("usage: stalemap guard <file>...");
    const { guardFile, guardMessage } = await import("./guard.js");
    let found = 0;
    for (const f of rest) {
      const result = await guardFile({ cwd: opts.cwd, file: f, model: opts.model, useCache: opts.useCache });
      const msg = guardMessage(result, opts.cwd);
      // Edit-time notes are printed but don't fail the check: only problems do.
      if (result?.findings.length) found++;
      if (msg) process.stdout.write(msg + "\n\n");
    }
    if (!found) info("No stale APIs found.");
    return found ? 1 : 0;
  }

  if (command === "mcp") {
    const { serveStdio } = await import("./mcp.js");
    // --model (or $STALEMAP_MODEL) for clients that don't say which model is asking.
    await serveStdio(opts.cwd, { model: opts.model ?? process.env.STALEMAP_MODEL });
    return -1; // keep running; the transport owns the process
  }

  if (command === "search") {
    const query = rest.join(" ").trim();
    if (!query) throw new Error("usage: stalemap search <query> [--package <name>]");
    const { searchChanges } = await import("./search.js");
    const { text } = await searchChanges({ cwd: opts.cwd, query, package: opts.package, model: opts.model ?? process.env.STALEMAP_MODEL, cutoff: opts.cutoff, useCache: opts.useCache });
    process.stdout.write(text + "\n");
    return 0;
  }

  if (command === "probe") return probeCommand(opts);

  if (command === "models") {
    const q = rest.join(" ").trim();
    if (!q) throw new Error("usage: stalemap models <query>");
    const hits = (await searchModels(q, opts.useCache)).slice(0, 25);
    if (!hits.length) info(`No models matching "${q}".`);
    for (const m of hits) process.stdout.write(`${pad(m.id, 40)}${pad(m.provider, 16)}cutoff ${m.knowledge}\n`);
    return 0;
  }

  if (command === "remove") {
    const target = opts.target ? resolve(opts.cwd, opts.target) : defaultTarget(opts.cwd);
    const { text, block } = await readBlock(target);
    if (!text || !block) {
      info(`No stalemap block in ${relative(opts.cwd, target)}.`);
      return 0;
    }
    if (!opts.dryRun) await writeFile(target, removeBlock(text));
    info(`${opts.dryRun ? "Would remove" : "Removed"} the stalemap block from ${relative(opts.cwd, target)}.`);
    return 0;
  }

  if (command === "check") {
    const { status, targetName } = await checkBlock(opts);
    if (status === "missing") info(`✗ ${targetName} has no stalemap block. Run \`stalemap sync\`.`);
    else if (status === "stale") info(`✗ The stalemap block in ${targetName} is out of date (dependencies or model changed). Run \`stalemap sync\`.`);
    else info(`✓ The stalemap block in ${targetName} is up to date.`);
    return status === "fresh" ? 0 : 1;
  }

  if (command !== "scan" && command !== "sync") throw new Error(`Unknown command "${command}". See stalemap --help.`);

  const prepared = await prepareProject(opts);
  const { model } = prepared;
  const from = model.modelSource === "--model" ? "" : ` (from ${model.modelSource}; override with --model)`;
  info(`stalemap ${TOOL_VERSION} · model ${model.id}${from} · training cutoff ${isoDate(model.cutoff)} (${model.cutoffSource})`);
  if (opts.examples) info("Generating before/after examples (verified against the pinned versions)…");
  if (opts.guides) info("Reading the upgrade guides for changed packages…");
  const { project, selected, hash, target, reports, rendered } = await runStalemap(opts, prepared);
  const targetName = relative(opts.cwd, target) || target;

  if (command === "scan") {
    if (opts.json) {
      process.stdout.write(JSON.stringify({ model: { ...model, cutoff: isoDate(model.cutoff) }, target: targetName, hash, reports, block: rendered.block }, null, 2) + "\n");
      return 0;
    }
    printReport(project, reports, selected.length, opts);
    info(`\n── block for ${targetName} (~${rendered.tokens} tokens${rendered.dropped ? `, ${rendered.dropped} lower-priority notes left out by --budget` : ""}) ──`);
    process.stdout.write(rendered.block + "\n");
    info(`\nRun \`stalemap sync\` to write it${opts.llm ? "" : ", or add --llm for Claude-written summaries of the changelogs"}.`);
    return 0;
  }

  // sync
  printReport(project, reports, selected.length, opts);
  const existing = await readBlock(target);
  if (sameBlock(existing.block, rendered.block)) {
    info(`\n${targetName} is already up to date.`);
    return 0;
  }
  if (opts.dryRun) {
    info(`\n── would write to ${targetName} (~${rendered.tokens} tokens) ──`);
    process.stdout.write(rendered.block + "\n");
    return 0;
  }
  if (!opts.yes) {
    if (!process.stdin.isTTY) throw new Error(`Refusing to write ${targetName} without confirmation; re-run with --yes.`);
    process.stderr.write(`\n${rendered.block}\n\n`);
    const verb = existing.block ? "Replace the stalemap block in" : existing.text ? "Append this block to" : "Create";
    if (!(await confirm(`${verb} ${targetName}? [y/N] `))) {
      info("Nothing written.");
      return 0;
    }
  }
  const current = existing.text;
  await writeFile(target, applyBlock(current, rendered.block));
  info(`\n${existing.block ? "Updated" : current ? "Added" : "Created"} the stalemap block in ${targetName} (~${rendered.tokens} tokens).`);
  if (target.endsWith("AGENTS.md")) {
    const claude = resolve(opts.cwd, "CLAUDE.md");
    const claudeText = await readFile(claude, "utf8").catch(() => undefined);
    if (claudeText !== undefined && !claudeText.includes("AGENTS.md")) {
      info("Tip: CLAUDE.md doesn't reference AGENTS.md. Add `@AGENTS.md` to it, or use --target CLAUDE.md, so Claude Code sees these notes.");
    }
  }
  return 0;
}

run().then(
  (code) => {
    // Let stdout drain first: large --json output is cut off by an immediate exit when piped.
    if (code >= 0) process.stdout.write("", () => process.exit(code));
  },
  (err) => {
    process.stderr.write(`stalemap: ${(err as Error).message}\n`);
    process.exit(2);
  },
);

async function probeCommand(opts: Options): Promise<number> {
  const { parseModelSpecs, runProbes, summarize, probesDir } = await import("./probe/run.js");
  const models = parseModelSpecs(opts.models ?? opts.model ?? "");
  if (!models.length) throw new Error("stalemap probe needs --models (comma-separated, e.g. claude-sonnet-4-5,claude-opus-5-5)");
  const arms = opts.arms.split(",").map((a) => a.trim()) as Array<"bare" | "notes">;
  if (arms.some((a) => a !== "bare" && a !== "notes")) throw new Error("--arms takes bare, notes or both");

  let provider;
  if (!opts.dryRun) {
    const p = await import("./probe/providers.js");
    const name = opts.provider ?? "anthropic";
    if (name === "anthropic") provider = await p.anthropicProvider();
    else if (name === "openai") provider = p.openaiCompatibleProvider(opts.baseUrl ?? "http://localhost:11434/v1", process.env[opts.apiKeyEnv ?? "OPENAI_API_KEY"]);
    else if (name === "claude-code") provider = p.claudeCodeProvider();
    else throw new Error(`Unknown --provider "${name}" (anthropic, openai or claude-code)`);
  }

  const { runs, dry } = await runProbes({
    cwd: opts.cwd,
    models,
    provider,
    arms,
    maxProbes: opts.maxProbes,
    includeUnused: opts.includeUnused,
    concurrency: 4,
    useCache: opts.useCache,
    dryRun: opts.dryRun,
    margin: opts.margin,
  });

  if (opts.dryRun) {
    if (opts.json) {
      process.stdout.write(JSON.stringify(dry, null, 2) + "\n");
      return 0;
    }
    for (const d of dry) {
      process.stdout.write(`\n[${d.model}] ${d.probe.pkg}@${d.probe.version} · ${d.probe.kind} · ${d.probe.symbol}\n  grades on: ${[...d.probe.target.names, ...(d.probe.target.callees ?? []).map((c) => c + "()")].join(", ")}\n  prompt: ${d.prompts.bare}\n`);
    }
    info(`\n${dry.length} probes. Without --dry-run each runs ${arms.length === 2 ? "twice (with and without notes)" : "once"} per model.`);
    return 0;
  }
  if (opts.json) {
    process.stdout.write(JSON.stringify(runs, null, 2) + "\n");
    return 0;
  }
  process.stdout.write(summarize(runs) + "\n");
  info(`\nDetails: ${relative(opts.cwd, probesDir(opts.cwd))}/summary.md. \`stalemap sync\` now ranks notes by these results.`);
  return 0;
}

async function setupCommand(opts: Options, rest: string[]): Promise<number> {
  const { setupAgent, SETUP_AGENTS, AGENT_NAMES } = await import("./setup.js");
  type Agent = (typeof SETUP_AGENTS)[number];
  const agent = (opts.agent ?? rest[0]) as Agent | undefined;
  if (!agent || !SETUP_AGENTS.includes(agent)) throw new Error(`usage: stalemap setup --agent <${SETUP_AGENTS.join("|")}>`);
  if (!existsSync(opts.cwd)) throw new Error(`No such directory: ${opts.cwd}`);
  const { detectModel } = await import("./models.js");

  const result = await setupAgent({
    agent,
    cwd: opts.cwd,
    dryRun: opts.dryRun,
    target: opts.target ? relative(opts.cwd, resolve(opts.cwd, opts.target)) : undefined,
    renderNotes: async (target) => {
      if (!existsSync(resolve(opts.cwd, "package.json"))) return { skip: "no package.json here" };
      // The notes are for the model this agent runs, so its own settings come first.
      const detected = opts.model || opts.cutoff ? undefined : await detectModel(opts.cwd, agent);
      const base = { ...opts, target };
      let prepared;
      let source = opts.model ? "--model" : detected?.source;
      try {
        prepared = await prepareProject({ ...base, model: opts.model ?? detected?.model });
      } catch (err) {
        if (!detected) throw err;
        prepared = await prepareProject(base); // the agent's model isn't in the catalog: detect as usual
        source = prepared.model.modelSource;
      }
      const { reports, rendered, model } = await runStalemap(base, prepared);
      const changed = reports.filter((r) => r.status === "changed" || r.status === "new").length;
      // Cursor keeps its model where stalemap can't read it; Claude Code may not set one at all.
      const borrowed = source && !["--model", "--cutoff", "STALEMAP_MODEL"].includes(source) && !source.startsWith(AGENT_NAMES[agent]) && !(agent === "claude" && source === "ANTHROPIC_MODEL");
      return {
        block: rendered.block,
        detail: `model ${model.id}${source && source !== "--model" ? ` from ${source}` : ""}, ${changed} changed dependenc${changed === 1 ? "y" : "ies"}, ~${rendered.tokens} tokens`,
        note: borrowed ? `The notes are for ${model.id}, the model set in ${source}. If ${AGENT_NAMES[agent]} uses another one, re-run with --model <id>.` : undefined,
      };
    },
  });

  const verb = (a: string) => (a === "create" || a === "update" ? (opts.dryRun ? `would ${a}` : `${a}d`) : a);
  const w = Math.max(...result.changes.map((c) => c.file.length)) + 2;
  info(`stalemap setup for ${AGENT_NAMES[agent]}${opts.dryRun ? " (dry run: nothing written)" : ""}`);
  for (const c of result.changes) {
    const [first, ...more] = (c.detail ?? "").split("\n");
    info(`  ${pad(verb(c.action), 14)}${pad(c.file, w)}${c.what}${first ? ` (${first}${more.length ? "" : ")"}` : ""}`);
    if (more.length) info(more.map((l) => " ".repeat(16 + w) + l).join("\n") + ")");
  }
  const manual = result.changes.some((c) => c.action === "skipped" && c.what !== "notes block");
  if (!result.files.size) info(manual ? "\nNothing written: add the entries above by hand." : `\nNothing to change: ${AGENT_NAMES[agent]} is already set up here.`);
  if (opts.dryRun) {
    const notesFile = result.changes[0]!.file;
    for (const [file, text] of result.files) {
      if (file === notesFile) continue; // the block is long; `stalemap sync --dry-run` shows it
      process.stdout.write(`\n── ${file} ──\n${text}`);
    }
  }
  for (const n of result.notes) info(`\nNote: ${n}`);
  return 0;
}
