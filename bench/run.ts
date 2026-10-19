/**
 * stalemap benchmark: does an agent write current code for post-cutoff library versions
 * (a) alone, (b) with a docs MCP server (Context7), (c) with stalemap's notes?
 *
 * Each session runs headless Claude Code (`claude -p`) in a fresh copy of a project pinned to
 * ai@7, zod@4 and next@16, isolated from the user's own settings, hooks, plugins and MCP
 * servers (--restricted --strict-mcp-config). Hidden tests and a type-check grade the result.
 *
 * The exploratory `stalemap-full` arm (after the v3 run) adds stalemap's own MCP server, with its
 * `search_changes` tool and a rule like the Context7 arm's (bench/arms/stalemap.md), to the notes and the guard.
 *
 *   npx tsx bench/run.ts --model claude-sonnet-4-5 [--arms alone,context7,stalemap]
 *     [--modes oneshot,checks] [--tasks a,b] [--reps 1] [--concurrency 3] [--out bench/results/<date>]
 *     [--suite dev|heldout|heldout-v2|heldout-v3] [--notes per-task|per-template] [--guides] [--notes-only]
 *     [--shard 1/2] [--resume] [--stop-on-limit]
 *   npx tsx bench/run.ts --report bench/results/<date>
 *   npx tsx bench/run.ts --merge bench/results/<run> bench/results/<run>-shard-1-of-2 bench/results/<run>-shard-2-of-2
 *
 * heldout-v3 differs in three ways: stalemap's notes are generated per task from the task's starting workspace
 * (`stalemap scan` without --all, as a user would run it), the `oracle` arm gets a one-line hint naming the change
 * (meta.json `oracle`; other suites read bench/arms/oracle/<suite>.json), and --stop-on-limit ends the run at the
 * first plan or API limit instead of waiting it out.
 *
 * Context7 arms need keys: CONTEXT7_KEYS_FILE (one per line, spread across sessions) or CONTEXT7_API_KEY.
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, cp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { Context7Keys, context7Answered, context7Connected, context7Errors, context7TurnedAway, hookRuns, jobList, limitReason, mergeShards, parseShard, runIdOf, shardJobs, stalemapMcpConfig } from "./scale.ts";

const BENCH = dirname(fileURLToPath(import.meta.url));
const ROOT = join(BENCH, "..");
const WORK = join(BENCH, ".work");
const TEMPLATE_MODULES = join(WORK, "template", "node_modules");

type Arm = "alone" | "context7" | "stalemap" | "stalemap-guard" | "context7-stalemap" | "oracle" | "tsc-hook" | "stalemap-full";
const ARMS: Arm[] = ["alone", "context7", "stalemap", "stalemap-guard", "context7-stalemap", "oracle", "tsc-hook", "stalemap-full"];
const usesNotes = (a: Arm) => a === "stalemap" || a === "stalemap-guard" || a === "context7-stalemap" || a === "stalemap-full";
const usesGuard = (a: Arm) => a === "stalemap-guard" || a === "context7-stalemap" || a === "stalemap-full";
const usesContext7 = (a: Arm) => a === "context7" || a === "context7-stalemap";
/** stalemap's own MCP server (`stalemap mcp`, with `search_changes`), with a rule like the Context7 arm's. */
const usesStalemapMcp = (a: Arm) => a === "stalemap-full";
/** Arms with a post-edit hook: stalemap's guard, or the plain `tsc --noEmit` hook (bench/arms/tsc-hook.mjs). */
const usesHook = (a: Arm) => usesGuard(a) || a === "tsc-hook";

type Suite = "dev" | "heldout" | "heldout-v2" | "heldout-v3";
const SUITES: Suite[] = ["dev", "heldout", "heldout-v2", "heldout-v3"];
/** Suites from v2 on keep their own templates and install them under .work/template-<suite>-<name>. */
const ownTemplates = (s: Suite) => s === "heldout-v2" || s === "heldout-v3";
let SUITE: Suite = "dev";
const tasksDir = () => (SUITE === "dev" ? join(BENCH, "tasks") : join(BENCH, SUITE, "tasks"));
/** Template folder (package.json + tsconfig) and its installed node_modules for a task. */
function templateOf(templateName: string): { files: string; modules: string } {
  if (SUITE === "dev") return { files: join(BENCH, "template"), modules: TEMPLATE_MODULES };
  if (ownTemplates(SUITE)) {
    return { files: join(BENCH, SUITE, "templates", templateName), modules: join(WORK, `template-${SUITE}-${templateName}`, "node_modules") };
  }
  return {
    files: join(BENCH, "heldout", "templates", templateName),
    modules: templateName === "latest" ? TEMPLATE_MODULES : join(WORK, `template-${templateName}`, "node_modules"),
  };
}
type Mode = "oneshot" | "checks";

interface TaskMeta {
  title: string;
  template?: string;
  scenario?: string;
  stale: string[];
  deprecated: string[];
  currentFile?: string;
  /** heldout-v3: the one-line hint the oracle arm gets, naming the change the task targets. */
  oracle?: string;
}

interface SessionResult {
  runId: string;
  task: string;
  arm: Arm;
  mode: Mode;
  rep: number;
  model: string;
  pass: boolean;
  tscOk: boolean;
  testsOk: boolean;
  staleFinal: boolean;
  staleFirstEdit: boolean | null;
  deprecatedFinal: boolean;
  currentConvention: boolean | null;
  turns: number | null;
  costUsd: number | null;
  durationMs: number | null;
  toolCalls: Record<string, number>;
  context7Calls: number;
  /** Calls to stalemap's MCP tools (stalemap-full arm). */
  stalemapCalls?: number;
  /** Guard hook runs that reported a problem / total guard runs (stalemap-guard arm). */
  guardFindings: number;
  guardRuns: number;
  /** Guard hook runs that showed edit-time notes (changes that still type-check). */
  guardNotes?: number;
  isError: boolean;
  tscErrors: string[];
  testFailures: string[];
  /** Times the session hit a plan/API limit and was re-run from a fresh workspace, and why. */
  limitRetries?: number;
  limitReasons?: string[];
  /** Wall time of each guard hook run (ms; null if it never returned), as Claude Code ran it. */
  guardMs?: (number | null)[];
  /** Guard hook runs Claude Code killed at the 60 s hook timeout. */
  guardTimeouts?: number;
  /** Guard hook runs that hit the guard's own 25 s deadline before checking the file: no findings shown. */
  guardIncomplete?: number;
  /** Context7 tool calls that returned an error (rate limits included); whether its server connected. */
  context7Errors?: number;
  context7Connected?: boolean | null;
  /** Which Context7 key served the session (1-based; keys are never recorded), and how often a key turned it away first. */
  context7Key?: number | null;
  context7KeyRetries?: number;
  startedAt?: string;
  /** Wall time of the scored `claude -p` process, as the harness saw it. */
  wallMs?: number;
}

const sh = promisify(execFile);

// ---------------------------------------------------------------------------
// Workspace

async function listTasks(): Promise<string[]> {
  return (await readdir(tasksDir(), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

async function taskMeta(task: string): Promise<TaskMeta> {
  return JSON.parse(await readFile(join(tasksDir(), task, "meta.json"), "utf8")) as TaskMeta;
}

/**
 * Notes are keyed by template, or by `task:<task>` with --notes per-task, plus "+guard" for the arms
 * that run the guard (ranked for it).
 */
const notesKey = (base: string, guard: boolean) => `${base}${guard ? "+guard" : ""}`;
const notesFile = (out: string, key: string) =>
  key.startsWith("task:")
    ? join(out, "notes", `${key.slice("task:".length).replace("+", "-")}.md`)
    : join(out, `stalemap-notes${key.startsWith("latest") ? key.slice("latest".length) : `-${key}`}.md`.replace("+", "-"));

async function stalemapNotes(model: string, examples: boolean, templateName = "latest", guard = false): Promise<string> {
  const t = templateOf(templateName);
  const dir = join(WORK, `notes-project-${SUITE}-${templateName}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  // tsconfig.json too: TypeScript's deprecated compiler options get a note when the project has one.
  for (const f of ["package.json", "tsconfig.json"]) if (existsSync(join(t.files, f))) await cp(join(t.files, f), join(dir, f));
  await symlink(t.modules, join(dir, "node_modules"), "dir");
  // --all: the starter files import nothing yet, so cover every direct dependency. --guard / --no-guard:
  // rank for the arm's setup (the notes folder has no hook config to detect it from).
  const args = ["scan", "--cwd", dir, "--model", model, "--all", "-q", guard ? "--guard" : "--no-guard", ...(examples ? ["--examples"] : [])];
  const { stdout } = await sh(process.execPath, [join(ROOT, "dist", "cli.js"), ...args], { maxBuffer: 8 * 1024 * 1024 });
  return stdout.trim();
}


/**
 * Notes for one task, the way a user gets them: `stalemap scan` (no --all) in a copy of the task's
 * starting project, so imports and config files decide what's covered and how it ranks.
 */
async function stalemapTaskNotes(model: string, extra: string[], task: string, guard: boolean): Promise<string> {
  const dir = join(WORK, `notes-${SUITE}-${task}`);
  await prepareWorkspace(dir, task);
  const args = ["scan", "--cwd", dir, "--model", model, "-q", guard ? "--guard" : "--no-guard", ...extra];
  const { stdout } = await sh(process.execPath, [join(ROOT, "dist", "cli.js"), ...args], {
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout.trim();
}

/**
 * The oracle arm's note for a task: one line naming the change the task turns on. heldout-v3 keeps the line in each
 * task's meta.json (`oracle`); other suites in bench/arms/oracle/<suite>.json, keyed by task.
 */
async function oracleNote(task: string): Promise<string> {
  const file = join(BENCH, "arms", "oracle", `${SUITE}.json`);
  const line =
    SUITE === "heldout-v3" ? (await taskMeta(task)).oracle : existsSync(file) ? (JSON.parse(await readFile(file, "utf8")) as Record<string, string>)[task] : undefined;
  if (!line) throw new Error(`No oracle note for ${task} in ${SUITE === "heldout-v3" ? "its meta.json" : relative(ROOT, file)}`);
  return [
    "## A dependency change that matters for this task",
    "",
    "Your training data predates the versions this project pins. When this note conflicts with what you remember, follow the note: it describes the installed version.",
    "",
    `- ${line}`,
  ].join("\n");
}

async function systemPrompt(arm: Arm, mode: Mode, notes: string, task: string): Promise<string> {
  const parts = [await readFile(join(BENCH, "arms", "base.md"), "utf8")];
  if (mode === "checks") parts.push(await readFile(join(BENCH, "arms", "checks.md"), "utf8"));
  if (usesContext7(arm)) parts.push(await readFile(join(BENCH, "arms", "context7.md"), "utf8"));
  if (usesStalemapMcp(arm)) parts.push(await readFile(join(BENCH, "arms", "stalemap.md"), "utf8"));
  if (usesNotes(arm)) parts.push(notes);
  if (arm === "oracle") parts.push(await oracleNote(task));
  return parts.join("\n").trim() + "\n";
}

/**
 * Build the search index for a task's starting workspace once, before any session, so a session's
 * first search reads it from the cache like every later one (and every rep sees the same data).
 */
async function warmSearch(model: string, task: string): Promise<string> {
  const dir = join(WORK, `notes-${SUITE}-${task}`);
  if (!existsSync(join(dir, "package.json"))) await prepareWorkspace(dir, task);
  const { stdout } = await sh(process.execPath, [join(ROOT, "dist", "cli.js"), "search", "--cwd", dir, "--model", model, "-q", "configuration options"], { maxBuffer: 8 * 1024 * 1024 });
  return stdout;
}

async function prepareWorkspace(dir: string, task: string): Promise<void> {
  const t = templateOf((await taskMeta(task)).template ?? "latest");
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const f of ["package.json", "tsconfig.json"]) await cp(join(t.files, f), join(dir, f));
  await cp(join(tasksDir(), task, "files"), dir, { recursive: true });
  await symlink(t.modules, join(dir, "node_modules"), "dir");
  await sh("git", ["init", "-q"], { cwd: dir });
}

// ---------------------------------------------------------------------------
// Session

interface Transcript {
  events: unknown[];
  /** When each event reached the harness (ms), for timing hooks. */
  times: number[];
  stderr: string;
  wallMs: number;
  result?: { num_turns?: number; total_cost_usd?: number; duration_ms?: number; is_error?: boolean; result?: string };
}

/** Running sessions, killed if the harness stops early. */
const live = new Set<ChildProcess>();
process.on("exit", () => live.forEach((c) => c.kill("SIGTERM")));

/** Plan or API limits pause new sessions for every worker until this time. */
let pausedUntil = 0;
const untilUnpaused = async () => {
  while (Date.now() < pausedUntil) await new Promise((r) => setTimeout(r, pausedUntil - Date.now()));
};

function runClaude(args: string[], cwd: string, transcriptPath: string, timeoutMs: number, env?: Record<string, string>): Promise<Transcript> {
  return new Promise((done) => {
    const started = Date.now();
    const child = spawn("claude", args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: env ? { ...process.env, ...env } : process.env });
    live.add(child);
    const events: unknown[] = [];
    const times: number[] = [];
    let stderr = "";
    let buf = "";
    let result: Transcript["result"];
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        void appendFile(transcriptPath, line + "\n");
        try {
          const ev = JSON.parse(line) as { type?: string };
          events.push(ev);
          times.push(Date.now());
          if (ev.type === "result") result = ev as Transcript["result"];
        } catch {
          // not JSON
        }
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
      void appendFile(transcriptPath + ".stderr", chunk);
    });
    child.on("close", () => {
      clearTimeout(timer);
      live.delete(child);
      done({ events, times, stderr, wallMs: Date.now() - started, result });
    });
  });
}

interface ToolUse {
  name: string;
  input: Record<string, unknown>;
}

function toolUses(events: unknown[]): ToolUse[] {
  const out: ToolUse[] = [];
  for (const ev of events as Array<{ type?: string; message?: { content?: Array<{ type: string; name?: string; input?: Record<string, unknown> }> } }>) {
    if (ev.type !== "assistant") continue;
    for (const block of ev.message?.content ?? []) {
      if (block.type === "tool_use" && block.name) out.push({ name: block.name, input: block.input ?? {} });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Grading

async function agentFiles(dir: string): Promise<string> {
  const texts: string[] = [];
  // heldout-v2 also has stale patterns for Prisma schemas, stylesheets and tsconfig.json; heldout-v3 for any
  // source, style or config file an agent may write (but not the lockfile).
  const scanned =
    SUITE === "heldout-v3"
      ? /^(?!package-lock\.json$).*\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|json|prisma|css|ya?ml)$/
      : SUITE === "heldout-v2"
        ? /\.(ts|tsx|js|mjs|prisma|css)$|^tsconfig\.json$/
        : /\.(ts|tsx|js|mjs)$/;
  const walk = async (d: string) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (["node_modules", ".git", "test", "package.json", "package-lock.json"].includes(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (scanned.test(e.name)) texts.push(await readFile(p, "utf8"));
    }
  };
  await walk(dir);
  return texts.join("\n");
}

const matchesAny = (text: string, patterns: string[]) => patterns.some((p) => new RegExp(p).test(text));

async function grade(dir: string, task: string): Promise<Pick<SessionResult, "tscOk" | "testsOk" | "tscErrors" | "testFailures">> {
  await mkdir(join(dir, "test", "hidden"), { recursive: true });
  await cp(join(tasksDir(), task, "hidden"), join(dir, "test", "hidden"), { recursive: true });
  const bin = (n: string) => join(dir, "node_modules", ".bin", n);
  let tscOk = true;
  let tscErrors: string[] = [];
  try {
    await sh(bin("tsc"), ["--noEmit", "-p", "tsconfig.json"], { cwd: dir, maxBuffer: 8 * 1024 * 1024 });
  } catch (err) {
    tscOk = false;
    tscErrors = String((err as { stdout?: string }).stdout ?? "").split("\n").filter((l) => /error TS/.test(l)).slice(0, 10);
  }
  let testsOk = true;
  let testFailures: string[] = [];
  const hidden = (await readdir(join(dir, "test", "hidden"))).map((f) => join("test", "hidden", f));
  try {
    await sh(bin("tsx"), ["--test", ...hidden], { cwd: dir, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  } catch (err) {
    testsOk = false;
    testFailures = String((err as { stdout?: string }).stdout ?? "").split("\n").filter((l) => /not ok|AssertionError|Error:/.test(l)).slice(0, 10);
  }
  return { tscOk, testsOk, tscErrors, testFailures };
}

// ---------------------------------------------------------------------------
// Context7 keys

/** The run's Context7 keys (never logged or written anywhere) and the calls each has left. */
let context7Keys: { keys: string[]; pool: Context7Keys } | undefined;

/**
 * Context7 API keys: one per line in the file CONTEXT7_KEYS_FILE names, or the one in CONTEXT7_API_KEY.
 * With several, sessions are spread across them (Context7Keys).
 */
async function readContext7Keys(): Promise<string[]> {
  const file = process.env.CONTEXT7_KEYS_FILE;
  const keys = file ? (await readFile(file, "utf8")).split("\n").map((l) => l.trim()) : [process.env.CONTEXT7_API_KEY ?? ""];
  return [...new Set(keys.filter(Boolean))];
}

/** Calls a Context7 key has left this month, from its usage endpoint, which doesn't count as a call. */
async function context7Remaining(key: string): Promise<number> {
  const res = await fetch("https://context7.com/api/v2/usage", { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`usage check failed with HTTP ${res.status}`);
  const d = (await res.json()) as { plan?: string; member?: { requests?: number; includedInPlan?: number } };
  // Paid plans bill calls past the included ones instead of refusing them.
  if (d.plan && d.plan !== "free") return Number.POSITIVE_INFINITY;
  return Math.max(0, (d.member?.includedInPlan ?? 0) - (d.member?.requests ?? 0));
}

/** A Context7 key for one session. Waits while running sessions hold the rest; stops the run when every key is out. */
async function takeContext7Key(runId: string): Promise<number> {
  const { pool } = context7Keys!;
  for (;;) {
    const i = pool.acquire();
    if (i !== undefined) return i;
    if (!pool.busy) throw new LimitHit(`${runId}: the Context7 keys are out of calls (${pool.left} left; they reset on the 1st, or add keys to CONTEXT7_KEYS_FILE)`);
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

// ---------------------------------------------------------------------------

async function runSession(opts: {
  task: string;
  arm: Arm;
  mode: Mode;
  rep: number;
  model: string;
  notes: Record<string, string>;
  out: string;
  stopOnLimit?: boolean;
}): Promise<SessionResult> {
  const runId = runIdOf(SUITE, opts);
  const dir = join(WORK, "runs", runId);
  await prepareWorkspace(dir, opts.task);
  const sysFile = join(WORK, "runs", `${runId}.system.md`);
  const meta = await taskMeta(opts.task);
  // Per-task notes when the run made them, otherwise the template's.
  const taskKey = notesKey(`task:${opts.task}`, usesGuard(opts.arm));
  const notesAt = taskKey in opts.notes ? taskKey : notesKey(meta.template ?? "latest", usesGuard(opts.arm));
  await writeFile(sysFile, await systemPrompt(opts.arm, opts.mode, opts.notes[notesAt] ?? "", opts.task));
  const prompt = (await readFile(join(tasksDir(), opts.task, "task.md"), "utf8")).trim();

  const tools = ["Read", "Write", "Edit", "Glob", "Grep", ...(opts.mode === "checks" ? ["Bash"] : [])];
  const allowed = [...tools.filter((t) => t !== "Bash"), ...(opts.mode === "checks" ? ["Bash(npm test)", "Bash(npm test:*)", "Bash(npx tsc:*)"] : [])];
  if (usesContext7(opts.arm)) allowed.push("mcp__context7");
  if (usesStalemapMcp(opts.arm)) allowed.push("mcp__stalemap");
  const args = [
    "-p", prompt,
    "--model", opts.model,
    "--output-format", "stream-json", "--verbose",
    "--no-session-persistence",
    "--restricted", "--strict-mcp-config",
    "--permission-mode", "acceptEdits",
    "--append-system-prompt-file", sysFile,
    "--tools", tools.join(","),
    "--allowedTools", ...allowed,
    ...(usesContext7(opts.arm) ? ["--mcp-config", join(BENCH, "arms", "context7.mcp.json")] : []),
  ];
  if (usesStalemapMcp(opts.arm)) {
    // The build under test, serving this workspace for the session's model, on the same cache the notes warmed.
    const mcpFile = join(WORK, "runs", `${runId}.mcp.json`);
    await writeFile(mcpFile, JSON.stringify(stalemapMcpConfig(join(ROOT, "dist", "cli.js"), dir, opts.model, process.env.STALEMAP_CACHE), null, 2) + "\n");
    args.push("--mcp-config", mcpFile);
  }
  // The guard arm installs stalemap's post-edit hook; --settings applies even under --restricted.
  const guardLog = join(WORK, "runs", `${runId}.guard.jsonl`);
  await rm(guardLog, { force: true });
  if (usesGuard(opts.arm)) {
    // The notes are in the system prompt, where the hook can't see them: point it at the same text.
    const notesPath = resolve(notesFile(opts.out, notesAt));
    const env = `STALEMAP_MODEL=${opts.model} STALEMAP_GUARD_LOG=${JSON.stringify(guardLog)} STALEMAP_NOTES_FILE=${JSON.stringify(notesPath)}${process.env.STALEMAP_CACHE ? ` STALEMAP_CACHE=${JSON.stringify(process.env.STALEMAP_CACHE)}` : ""}`;
    const hook = { type: "command", command: `${env} ${JSON.stringify(process.execPath)} ${JSON.stringify(join(ROOT, "dist", "cli.js"))} hook post-edit`, timeout: 60 };
    args.push("--settings", JSON.stringify({ hooks: { PostToolUse: [{ matcher: "Write|Edit", hooks: [hook] }] } }));
  } else if (opts.arm === "tsc-hook") {
    // The plain alternative to the guard: the same hook slot and timeout, running the workspace's own tsc.
    const hook = { type: "command", command: `TSC_HOOK_LOG=${JSON.stringify(guardLog)} ${JSON.stringify(process.execPath)} ${JSON.stringify(join(BENCH, "arms", "tsc-hook.mjs"))}`, timeout: 60 };
    args.push("--settings", JSON.stringify({ hooks: { PostToolUse: [{ matcher: "Write|Edit", hooks: [hook] }] } }));
  }
  // Output only: lets the harness time each hook run.
  if (usesHook(opts.arm)) args.push("--include-hook-events");
  const transcriptDir = join(opts.out, "runs");
  await mkdir(transcriptDir, { recursive: true });
  const transcriptPath = join(transcriptDir, `${runId}.jsonl`);
  await rm(transcriptPath, { force: true });
  // A limit at any point voids the session, and so does a Context7 key that turned a call away (the
  // agent had a dead tool): discard it and start over from a fresh workspace.
  const limitReasons: string[] = [];
  let keyRetries = 0;
  const keyed = !!context7Keys && usesContext7(opts.arm);
  let key: number | undefined;
  let startedAt: string;
  let t: Transcript;
  for (;;) {
    if (keyed) key = await takeContext7Key(runId);
    startedAt = new Date().toISOString();
    t = await runClaude(args, dir, transcriptPath, 15 * 60_000, key === undefined ? undefined : { CONTEXT7_API_KEY: context7Keys!.keys[key] });
    if (key !== undefined) context7Keys!.pool.release(key, toolUses(t.events).filter((u) => u.name.startsWith("mcp__context7")).length);
    const reason = limitReason(t.events, t.result, t.stderr);
    if (reason) {
      limitReasons.push(reason);
      if (opts.stopOnLimit) throw new LimitHit(`${runId} hit a plan or API limit (${reason})`);
      if (limitReasons.length > 6) throw new LimitHit(`${runId} was still limited after 6 retries (${reason})`);
      const wait = Math.min(30 * 60_000, 60_000 * 2 ** (limitReasons.length - 1));
      pausedUntil = Math.max(pausedUntil, Date.now() + wait);
      process.stderr.write(`  ${runId}: limit hit (${reason}), pausing new sessions ${Math.round(wait / 60_000)} min and retrying (${limitReasons.length}/6)\n`);
      await untilUnpaused();
    } else if (key !== undefined && context7TurnedAway(t.events)) {
      keyRetries++;
      if (keyRetries > 2 * context7Keys!.keys.length) throw new LimitHit(`${runId}: Context7 keys kept turning calls away (${keyRetries} times)`);
      // Out of calls, or rate limited for now: the usage endpoint says which.
      const left = await context7Remaining(context7Keys!.keys[key]).catch(() => 0);
      context7Keys!.pool.setRemaining(key, left);
      process.stderr.write(`  ${runId}: Context7 key #${key + 1} turned a call away (${left ? "rate limited" : "out of calls"}); re-running the session (${keyRetries})\n`);
      if (left) await new Promise((r) => setTimeout(r, 30_000));
    } else break;
    await prepareWorkspace(dir, opts.task);
    await rm(transcriptPath, { force: true });
    await rm(guardLog, { force: true });
  }
  // A model this account can't use fails every session the same way: stop rather than score them all.
  if (t.result?.is_error && /issue with the selected model/i.test(t.result.result ?? "")) throw new Error(`${runId}: ${t.result.result} Check \`claude auth status\`.`);

  const uses = toolUses(t.events);
  const toolCalls: Record<string, number> = {};
  for (const u of uses) toolCalls[u.name] = (toolCalls[u.name] ?? 0) + 1;
  const firstEdit = uses.find((u) => u.name === "Write" || u.name === "Edit");
  const firstEditText = firstEdit ? String(firstEdit.input.content ?? firstEdit.input.new_string ?? "") : undefined;
  const finalText = await agentFiles(dir);
  const guardLines = existsSync(guardLog) ? (await readFile(guardLog, "utf8")).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as { findings: number; notes?: number }) : [];
  const g = await grade(dir, opts.task);
  const hooks = usesHook(opts.arm) ? hookRuns(t.events, t.times) : [];

  return {
    runId,
    task: opts.task,
    arm: opts.arm,
    mode: opts.mode,
    rep: opts.rep,
    model: opts.model,
    pass: g.tscOk && g.testsOk,
    ...g,
    staleFinal: matchesAny(finalText, meta.stale),
    staleFirstEdit: firstEditText === undefined ? null : matchesAny(firstEditText, meta.stale),
    deprecatedFinal: matchesAny(finalText, meta.deprecated),
    currentConvention: meta.currentFile ? existsSync(join(dir, meta.currentFile)) : null,
    turns: t.result?.num_turns ?? null,
    costUsd: t.result?.total_cost_usd ?? null,
    durationMs: t.result?.duration_ms ?? null,
    toolCalls,
    context7Calls: uses.filter((u) => u.name.startsWith("mcp__context7")).length,
    stalemapCalls: uses.filter((u) => u.name.startsWith("mcp__stalemap")).length,
    guardRuns: guardLines.length,
    guardFindings: guardLines.filter((g) => g.findings > 0).length,
    guardNotes: guardLines.filter((g) => (g.notes ?? 0) > 0).length,
    isError: !!t.result?.is_error || !t.result,
    limitRetries: limitReasons.length,
    limitReasons,
    guardMs: hooks.map((h) => h.ms),
    guardTimeouts: hooks.filter((h) => h.outcome === "cancelled" || (h.ms ?? 0) >= 60_000).length,
    // The guard logs each file it finishes checking; a run that logged nothing gave up at its deadline.
    guardIncomplete: Math.max(0, hooks.length - guardLines.length),
    context7Errors: context7Errors(t.events),
    context7Connected: usesContext7(opts.arm) ? (context7Connected(t.events) ?? false) : null,
    context7Key: key === undefined ? null : key + 1,
    context7KeyRetries: keyRetries,
    startedAt,
    wallMs: t.wallMs,
  };
}

/** A session hit a plan or API limit and --stop-on-limit is set: the run ends instead of retrying. */
/** The run should stop: a plan or API limit with --stop-on-limit, or Context7 keys out of calls. Running sessions finish. */
class LimitHit extends Error {}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>, stop = () => false): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length && !stop()) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

// ---------------------------------------------------------------------------
// Report

const median = (xs: number[]) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "–");

export function report(results: SessionResult[]): string {
  const model = results[0]?.model ?? "?";
  const lines: string[] = [`# stalemap benchmark: \`${model}\``, "", `${results.length} sessions. Hidden tests + \`tsc --noEmit\` decide pass/fail.`, ""];
  for (const mode of ["oneshot", "checks"] as Mode[]) {
    const rows = results.filter((r) => r.mode === mode);
    if (!rows.length) continue;
    lines.push(
      `## ${mode === "oneshot" ? "One-shot (file tools only, no way to run checks)" : "With checks (can run `npm test`: tsc + smoke tests)"}`,
      "",
      "| arm | pass | stale API in final code | stale API in first edit | deprecated API used | median turns | median cost (USD) | median time (s) | Context7 calls/session | stalemap searches/session | guard corrections/session |",
      "|---|---|---|---|---|---|---|---|---|---|---|",
    );
    for (const arm of ARMS) {
      const r = rows.filter((x) => x.arm === arm);
      if (!r.length) continue;
      const firstKnown = r.filter((x) => x.staleFirstEdit !== null);
      lines.push(
        `| ${arm} | ${r.filter((x) => x.pass).length}/${r.length} (${pct(r.filter((x) => x.pass).length, r.length)}) | ${pct(r.filter((x) => x.staleFinal).length, r.length)} | ${pct(firstKnown.filter((x) => x.staleFirstEdit).length, firstKnown.length)} | ${pct(r.filter((x) => x.deprecatedFinal).length, r.length)} | ${median(r.map((x) => x.turns ?? NaN))} | ${median(r.map((x) => x.costUsd ?? NaN)).toFixed(3)} | ${(median(r.map((x) => x.durationMs ?? NaN)) / 1000).toFixed(0)} | ${(r.reduce((s, x) => s + x.context7Calls, 0) / r.length).toFixed(1)} | ${(r.reduce((s, x) => s + (x.stalemapCalls ?? 0), 0) / r.length).toFixed(1)} | ${(r.reduce((s, x) => s + (x.guardFindings ?? 0), 0) / r.length).toFixed(1)} |`,
      );
    }
    lines.push("", "| task | " + ARMS.filter((a) => rows.some((x) => x.arm === a)).join(" | ") + " |", "|---|" + "---|".repeat(new Set(rows.map((x) => x.arm)).size));
    for (const task of [...new Set(rows.map((x) => x.task))].sort()) {
      const cells = ARMS
        .filter((a) => rows.some((x) => x.arm === a))
        .map((a) => {
          const r = rows.filter((x) => x.task === task && x.arm === a);
          return r.map((x) => (x.isError ? "err" : x.pass ? "✓" : "✗") + (x.staleFinal ? " stale" : x.deprecatedFinal ? " depr." : "")).join(", ") || "–";
        });
      lines.push(`| ${task} | ${cells.join(" | ")} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** The suite a session belongs to, from its run id. */
const suiteOfRunId = (runId: string): Suite =>
  runId.startsWith("heldout-v3.") ? "heldout-v3" : runId.startsWith("heldout-v2.") ? "heldout-v2" : runId.startsWith("heldout.") ? "heldout" : "dev";

/**
 * One cheap session that calls Context7 the way the arms do, with the same MCP config and environment.
 * A run whose Context7 arms would get no docs (quota used up, a bad key, a server that doesn't start)
 * doesn't start: held-out v2's ran against a tool that answered every call with "quota exceeded".
 */
async function context7Preflight(key?: string): Promise<string> {
  const dir = join(WORK, "context7-preflight");
  await mkdir(dir, { recursive: true });
  const transcript = join(dir, "preflight.jsonl");
  await rm(transcript, { force: true });
  const args = [
    "-p", 'Call the resolve-library-id tool once, with libraryName "react" and query "useState hook". Then reply with the first library ID it returned.',
    "--model", "claude-haiku-4-5",
    "--output-format", "stream-json", "--verbose",
    "--no-session-persistence",
    "--restricted", "--strict-mcp-config",
    "--tools", "Read",
    "--allowedTools", "mcp__context7",
    "--mcp-config", join(BENCH, "arms", "context7.mcp.json"),
  ];
  const t = await runClaude(args, dir, transcript, 3 * 60_000, key ? { CONTEXT7_API_KEY: key } : undefined);
  const limit = limitReason(t.events, t.result, t.stderr);
  if (limit) throw new Error(`Context7 preflight hit a limit (${limit}); try again later.`);
  const answer = context7Answered(t.events);
  if (!answer.ok) {
    const fix = key ? "check the key" : "set CONTEXT7_KEYS_FILE or CONTEXT7_API_KEY (free keys from https://context7.com/dashboard) in this shell";
    throw new Error(`Context7 preflight failed: ${answer.detail}\nThe context7 arms would get no docs: ${fix}, or leave those arms out.`);
  }
  return answer.detail;
}

/** The stalemap build under test: commit, uncommitted changes, and a hash of dist/ (which git ignores). */
async function buildInfo(): Promise<{ commit: string; dirty: boolean; dirtyPaths: string[]; distSha256: string | null; stalemapVersion: string }> {
  const git = async (args: string[]) => (await sh("git", ["--no-optional-locks", ...args], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 })).stdout.trim();
  // Not through git(): trimming would take the leading space of " M path" and then a letter of the path.
  const status = (await sh("git", ["--no-optional-locks", "status", "--porcelain"], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 })).stdout;
  const dirtyPaths = status.split("\n").filter(Boolean).map((l) => l.slice(3));
  const dist = join(ROOT, "dist");
  const hash = createHash("sha256");
  const walk = async (d: string) => {
    const entries = (await readdir(d, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else hash.update(`${relative(dist, p)}\0`).update(await readFile(p)).update("\0");
    }
  };
  if (existsSync(dist)) await walk(dist);
  return {
    commit: (await git(["rev-parse", "HEAD"])).trim(),
    dirty: dirtyPaths.length > 0,
    dirtyPaths,
    distSha256: existsSync(dist) ? hash.digest("hex") : null,
    stalemapVersion: (JSON.parse(await readFile(join(ROOT, "package.json"), "utf8")) as { version: string }).version,
  };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      model: { type: "string", default: "claude-sonnet-4-5" },
      arms: { type: "string", default: "alone,context7,stalemap" },
      modes: { type: "string", default: "oneshot,checks" },
      tasks: { type: "string" },
      reps: { type: "string", default: "1" },
      concurrency: { type: "string", default: "3" },
      out: { type: "string" },
      report: { type: "string" },
      examples: { type: "boolean" },
      guides: { type: "boolean" },
      notes: { type: "string" },
      "notes-only": { type: "boolean" },
      suite: { type: "string", default: "dev" },
      shard: { type: "string" },
      resume: { type: "boolean" },
      "stop-on-limit": { type: "boolean" },
      merge: { type: "string" },
    },
  });
  if (values.merge) {
    if (positionals.length < 2) throw new Error("usage: run.ts --merge <out> <shard dir> <shard dir>...");
    const rows = await mergeShards<SessionResult>(values.merge, positionals);
    const md = report(rows);
    await writeFile(join(values.merge, "report.md"), md + "\n");
    process.stderr.write(`merged ${positionals.length} shards, ${rows.length} sessions, into ${values.merge}\n`);
    return;
  }
  if (positionals.length) throw new Error(`unexpected argument ${positionals[0]}`);
  if (values.report) {
    const rows = (await readFile(join(values.report, "results.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l) as SessionResult);
    const md = report(rows);
    await writeFile(join(values.report, "report.md"), md + "\n");
    process.stdout.write(md + "\n");
    return;
  }
  if (!SUITES.includes(values.suite as Suite)) throw new Error(`--suite must be one of ${SUITES.join(", ")}`);
  SUITE = values.suite as Suite;
  if (ownTemplates(SUITE)) {
    if (!existsSync(templateOf("latest").modules)) throw new Error(`Install the template first: (mkdir -p bench/.work/template-${SUITE}-latest && cp bench/${SUITE}/templates/latest/*.json bench/.work/template-${SUITE}-latest/ && cd bench/.work/template-${SUITE}-latest && npm install --ignore-scripts)`);
  } else if (!existsSync(TEMPLATE_MODULES)) {
    throw new Error(`Install the template first: (mkdir -p ${relative(process.cwd(), join(WORK, "template"))} && cp bench/template/*.json bench/.work/template/ && cd bench/.work/template && npm install --ignore-scripts)`);
  }
  const shard = values.shard ? parseShard(values.shard) : undefined;
  const out = values.out ?? join(BENCH, "results", `${new Date().toISOString().slice(0, 10)}${SUITE === "dev" ? "" : `-${SUITE}`}${shard ? `-shard-${shard.index}-of-${shard.count}` : ""}`);
  // analyze.ts reads a results folder as one suite, so never append one suite's sessions to another's.
  if (existsSync(join(out, "results.jsonl"))) {
    const rows = (await readFile(join(out, "results.jsonl"), "utf8")).trim().split("\n").filter(Boolean);
    const other = rows.map((l) => (JSON.parse(l) as SessionResult).runId).find((id) => suiteOfRunId(id) !== SUITE);
    if (other) throw new Error(`${relative(process.cwd(), out)} already has sessions from another suite (${other}). Pass a different --out.`);
  }
  await mkdir(out, { recursive: true });
  const tasks = values.tasks ? values.tasks.split(",") : await listTasks();
  const arms = values.arms!.split(",") as Arm[];
  const unknownArm = arms.find((a) => !ARMS.includes(a));
  if (unknownArm) throw new Error(`Unknown arm ${unknownArm}; arms are ${ARMS.join(", ")}`);
  // Fail before any session runs if a task has no oracle note.
  if (arms.includes("oracle")) for (const t of tasks) await oracleNote(t);
  const modes = values.modes!.split(",") as Mode[];
  const reps = Number(values.reps);
  const templates = [...new Set(await Promise.all(tasks.map(async (t) => (await taskMeta(t)).template ?? "latest")))];
  // Record the stalemap build that writes the notes and runs the guard, once per invocation, with what
  // else a shard on another machine must share: Claude Code's version and the installed template versions.
  // Per-template notes (one `scan --all` per template) for the suites run that way; per-task notes from v3 on.
  const notesMode = values.notes ?? (SUITE === "heldout-v3" ? "per-task" : "per-template");
  if (notesMode !== "per-task" && notesMode !== "per-template") throw new Error("--notes must be per-task or per-template");
  const extra = [...(values.examples ? ["--examples"] : []), ...(values.guides ? ["--guides"] : [])];
  const run = { startedAt: new Date().toISOString(), suite: SUITE, model: values.model, tasks, arms, modes, reps, examples: !!values.examples, guides: !!values.guides, notes: notesMode };
  const installs: Record<string, string | null> = {};
  for (const t of templates) {
    const lock = join(templateOf(t).modules, ".package-lock.json");
    installs[t] = existsSync(lock) ? createHash("sha256").update(await readFile(lock)).digest("hex") : null;
  }
  const machine = { claudeVersion: (await sh("claude", ["--version"])).stdout.trim(), templates: installs, ...(shard ? { shard: `${shard.index}/${shard.count}` } : {}) };
  // Never the keys themselves: how many there were, the calls each had left, and that Context7 answered.
  let context7: { keys: number; callsLeft: Array<number | "unlimited">; preflight: string } | undefined;
  if (arms.some(usesContext7) && !values["notes-only"]) {
    const keys = await readContext7Keys();
    const left: number[] = [];
    for (const [i, k] of keys.entries()) left.push(await context7Remaining(k).catch((err: Error) => Promise.reject(new Error(`Context7 key #${i + 1}: ${err.message}`))));
    const best = keys.length ? left.indexOf(Math.max(...left)) : -1;
    const preflight = await context7Preflight(keys[best]);
    if (best >= 0) left[best] = await context7Remaining(keys[best]);
    if (keys.length) context7Keys = { keys, pool: new Context7Keys(left) };
    context7 = { keys: keys.length, callsLeft: left.map((n) => (Number.isFinite(n) ? n : "unlimited")), preflight };
    process.stderr.write(`Context7 preflight: ${preflight}. ${keys.length} key(s), calls left: ${context7.callsLeft.join(", ") || "anonymous"}\n`);
  }
  await appendFile(join(out, "build.jsonl"), JSON.stringify({ ...run, ...(await buildInfo()), ...machine, ...(context7 ? { context7 } : {}) }) + "\n");
  const notes: Record<string, string> = {};
  if (arms.some(usesNotes) || values["notes-only"]) {
    const guardModes = arms.some(usesNotes) ? [...new Set(arms.filter(usesNotes).map(usesGuard))] : [true];
    if (notesMode === "per-task") {
      await mkdir(join(out, "notes"), { recursive: true });
      // One at a time with --guides: the first task makes the guide notes, the rest reuse them.
      await mapLimit(tasks, values.guides ? 1 : 3, async (t) => {
        for (const guard of guardModes) {
          const key = notesKey(`task:${t}`, guard);
          notes[key] = await stalemapTaskNotes(values.model!, extra, t, guard);
          await writeFile(notesFile(out, key), notes[key] + "\n");
        }
      });
      // The search index the stalemap-full arm's MCP server reads, built once per task before any session.
      if (arms.some(usesStalemapMcp)) await mapLimit(tasks, 3, (t) => warmSearch(values.model!, t));
    } else {
      for (const t of templates) {
        for (const guard of guardModes) {
          const key = notesKey(t, guard);
          notes[key] = await stalemapNotes(values.model!, !!values.examples, t, guard);
          await writeFile(notesFile(out, key), notes[key] + "\n");
        }
      }
    }
  }
  if (values["notes-only"]) {
    process.stderr.write(`notes written to ${relative(process.cwd(), out)}; no sessions run (--notes-only)\n`);
    return;
  }

  // Arms interleaved, checks first within each repetition (see jobList); a shard takes whole tasks.
  let jobs = jobList(tasks, arms, modes, reps);
  if (shard) jobs = shardJobs(jobs, shard);
  if (values.resume && existsSync(join(out, "results.jsonl"))) {
    const have = new Set((await readFile(join(out, "results.jsonl"), "utf8")).split("\n").filter(Boolean).map((l) => (JSON.parse(l) as SessionResult).runId));
    jobs = jobs.filter((j) => !have.has(runIdOf(SUITE, j)));
  }
  if (context7Keys) {
    // Sessions made about 3 Context7 calls each in held-out v1 while it answered (2.9–3.5 by arm and mode).
    const sessions = jobs.filter((j) => usesContext7(j.arm)).length;
    process.stderr.write(`Context7: ${sessions} sessions, about ${Math.round(sessions * 3.1)} calls; ${context7Keys.pool.left} left across ${context7Keys.keys.length} key(s)\n`);
  }
  let done = 0;
  let limitHit: LimitHit | undefined;
  process.stderr.write(`${jobs.length} sessions with ${values.model}, concurrency ${values.concurrency}${shard ? `, shard ${shard.index}/${shard.count}` : ""}\n`);
  await mapLimit(jobs, Number(values.concurrency), async (j) => {
    await untilUnpaused();
    let r: SessionResult;
    try {
      r = await runSession({ ...j, model: values.model!, notes, out, stopOnLimit: !!values["stop-on-limit"] });
    } catch (err) {
      if (!(err instanceof LimitHit)) throw err;
      limitHit = err;
      process.stderr.write(`  ${err.message}: stopping; sessions already running finish first. Continue later with --resume.\n`);
      return undefined;
    }
    await appendFile(join(out, "results.jsonl"), JSON.stringify(r) + "\n");
    done++;
    const guard = r.guardMs?.length ? ` · guard max ${(Math.max(...r.guardMs.map((ms) => ms ?? 60_000)) / 1000).toFixed(1)}s` : "";
    const load = `${guard}${r.limitRetries ? ` · ${r.limitRetries} limit retries` : ""}${r.context7Errors ? ` · ${r.context7Errors} Context7 errors` : ""}`;
    process.stderr.write(`[${done}/${jobs.length}] ${r.runId}: ${r.isError ? "ERROR" : r.pass ? "pass" : "fail"}${r.staleFinal ? " (stale)" : ""} · ${r.turns ?? "?"} turns · $${r.costUsd?.toFixed(3) ?? "?"}${load}\n`);
    return r;
  }, () => limitHit !== undefined);
  const rows = existsSync(join(out, "results.jsonl"))
    ? (await readFile(join(out, "results.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as SessionResult)
    : [];
  const md = report(rows);
  await writeFile(join(out, "report.md"), md + "\n");
  process.stdout.write(md + "\n");
  if (limitHit) {
    process.stderr.write(`Stopped early: ${limitHit.message}. ${done} of ${jobs.length} sessions finished.\n`);
    process.exit(2);
  }
}

main().catch((err) => {
  process.stderr.write(`bench: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
