/**
 * What bench/run.ts needs to run many sessions at once without biasing an arm: limit detection
 * anywhere in a session, the guard hook's timings and Context7's errors from a transcript, the
 * job order, sharding across machines, and the checks that shards can be merged.
 */
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface Job<A extends string = string, M extends string = string> {
  task: string;
  arm: A;
  mode: M;
  rep: number;
}

/** A session's id, as run.ts names its transcript and results row. */
export const runIdOf = (suite: string, j: Job) => `${suite === "dev" ? "" : `${suite}.`}${j.task}.${j.arm}.${j.mode}.r${j.rep}`;

/**
 * Every session of a run, in start order. Within a repetition, checks-mode sessions (the long ones)
 * start before one-shot ones so the run doesn't end on a long tail; arms stay interleaved within
 * each task so time-of-day or rate-limit effects hit them evenly.
 */
export function jobList<A extends string, M extends string>(tasks: string[], arms: A[], modes: M[], reps: number): Job<A, M>[] {
  const ordered = [...modes].sort((a, b) => Number(b === "checks") - Number(a === "checks"));
  const jobs: Job<A, M>[] = [];
  for (let rep = 1; rep <= reps; rep++) for (const mode of ordered) for (const task of tasks) for (const arm of arms) jobs.push({ task, arm, mode, rep });
  return jobs;
}

export interface Shard {
  index: number;
  count: number;
}

export function parseShard(spec: string): Shard {
  const m = /^(\d+)\/(\d+)$/.exec(spec);
  const index = Number(m?.[1]);
  const count = Number(m?.[2]);
  if (!m || count < 1 || index < 1 || index > count) throw new Error(`--shard must look like 2/4 (shard 2 of 4), got ${spec}`);
  return { index, count };
}

/**
 * One shard's share of the job list. The unit is a block: one task × mode × repetition with all its
 * arms, so every arm of a task runs on the same machine and a machine's speed can't favor an arm.
 * Blocks go round-robin, which spreads tasks, modes and repetitions evenly across shards.
 */
export function shardJobs<J extends Job>(jobs: J[], shard: Shard): J[] {
  const blockOf = new Map<string, number>();
  return jobs.filter((j) => {
    const key = `${j.rep}\0${j.mode}\0${j.task}`;
    if (!blockOf.has(key)) blockOf.set(key, blockOf.size);
    return blockOf.get(key)! % shard.count === shard.index - 1;
  });
}

// ---------------------------------------------------------------------------
// Transcripts

interface Block {
  type?: string;
  id?: string;
  name?: string;
  tool_use_id?: string;
  is_error?: boolean;
  content?: unknown;
}
interface Event {
  type?: string;
  subtype?: string;
  message?: { content?: Block[] | string };
  rate_limit_info?: { status?: string };
  error_status?: number | null;
  is_api_error_message?: boolean;
  api_error_status?: number;
  hook_id?: string;
  hook_event?: string;
  outcome?: string;
  stdout?: string;
  mcp_servers?: Array<{ name?: string; status?: string }>;
}

const LIMIT_TEXT = /rate.?limit|usage limit|limit reached|overloaded|too many requests/i;
const LIMIT_STATUS = new Set([429, 529]);

/**
 * Why a session hit a plan or API limit, or undefined if it didn't. A session that hit one at any
 * point is discarded and re-run: a limit is not the agent's doing, and one that hit mid-session
 * would otherwise be scored as a fail. Only Claude Code's own signals count, never the agent's text.
 */
export function limitReason(events: unknown[], result?: { is_error?: boolean; result?: string }, stderr = ""): string | undefined {
  for (const ev of events as Event[]) {
    if (ev.type === "rate_limit_event") {
      const status = ev.rate_limit_info?.status;
      if (status && status !== "allowed" && status !== "allowed_warning") return `rate_limit_event ${status}`;
    } else if (ev.type === "system" && ev.subtype === "api_retry") {
      if (LIMIT_STATUS.has(ev.error_status ?? 0) || LIMIT_TEXT.test(JSON.stringify(ev))) return `api_retry ${ev.error_status ?? "?"}`;
    } else if (ev.type === "assistant" && ev.is_api_error_message) {
      if (LIMIT_STATUS.has(ev.api_error_status ?? 0) || LIMIT_TEXT.test(JSON.stringify(ev.message?.content ?? ""))) return `api error ${ev.api_error_status ?? "?"}`;
    }
  }
  // A session that ended in an error, or never finished, because of a limit: its error text, or
  // Claude Code's stderr and last non-agent events when there's no result.
  const ended = /rate.?limit|usage limit|limit reached|overloaded|429|529|too many requests|try again/i;
  if (result?.is_error && ended.test(String(result.result ?? ""))) return `ended: ${String(result.result).slice(0, 120)}`;
  if (!result) {
    const text = stderr + JSON.stringify((events as Event[]).slice(-3).filter((e) => e.type !== "assistant" && e.type !== "user"));
    if (ended.test(text)) return `no result: ${text.slice(0, 120)}`;
  }
  return undefined;
}


export interface HookRun {
  ms: number | null;
  /** Claude Code's outcome; "cancelled" when it killed the hook at its timeout. */
  outcome: string;
}

/**
 * PostToolUse hook runs, timed by when their hook_started and hook_response events reached the
 * harness (`times[i]` is when `events[i]` arrived). Needs --include-hook-events. A run with no
 * response (the session ended or was killed mid-hook) has `ms: null` and outcome "no response".
 */
export function hookRuns(events: unknown[], times: number[]): HookRun[] {
  const started = new Map<string, number>();
  const runs: HookRun[] = [];
  (events as Event[]).forEach((ev, i) => {
    if (ev.type !== "system" || ev.hook_event !== "PostToolUse" || !ev.hook_id) return;
    if (ev.subtype === "hook_started") started.set(ev.hook_id, times[i]);
    else if (ev.subtype === "hook_response") {
      const t0 = started.get(ev.hook_id);
      started.delete(ev.hook_id);
      runs.push({ ms: t0 === undefined ? null : times[i] - t0, outcome: ev.outcome ?? "?" });
    }
  });
  for (const _ of started) runs.push({ ms: null, outcome: "no response" });
  return runs;
}

/**
 * A Context7 answer with no docs in it: a quota or rate limit, or a key it rejects. The tool doesn't
 * flag these as errors: in held-out v2 every Context7 call answered "Monthly quota exceeded".
 */
export const CONTEXT7_FAILURE = /rate limited|quota exceeded|too many requests|invalid api key|\b429\b/i;

/** Each Context7 tool result in a session, with its text. */
function context7Results(events: unknown[]): Array<{ isError: boolean; text: string }> {
  const names = new Map<string, string>();
  const out: Array<{ isError: boolean; text: string }> = [];
  for (const ev of events as Event[]) {
    const content = ev.message?.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (ev.type === "assistant" && b.type === "tool_use" && b.id && b.name) names.set(b.id, b.name);
      if (ev.type === "user" && b.type === "tool_result" && names.get(b.tool_use_id ?? "")?.startsWith("mcp__context7")) {
        const raw = Array.isArray(b.content) ? b.content.map((c) => (c as { text?: string }).text ?? "").join(" ") : typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? "");
        out.push({ isError: !!b.is_error, text: raw.replace(/\s+/g, " ").trim() });
      }
    }
  }
  return out;
}

/** Context7 tool calls that came back as errors, rate limits included. */
export function context7Errors(events: unknown[]): number {
  return context7Results(events).filter((r) => r.isError || CONTEXT7_FAILURE.test(r.text)).length;
}

/** Whether Context7 turned any call away (quota, rate limit or a rejected key): the session had a dead tool. */
export const context7TurnedAway = (events: unknown[]) => context7Results(events).some((r) => CONTEXT7_FAILURE.test(r.text));

/** Whether a session's first Context7 call answered with a library ID, and if not, why. */
export function context7Answered(events: unknown[]): { ok: boolean; detail: string } {
  const [first] = context7Results(events);
  if (!first) return { ok: false, detail: context7Connected(events) === false ? "the Context7 server didn't connect" : "no Context7 call was made" };
  if (first.isError || CONTEXT7_FAILURE.test(first.text)) return { ok: false, detail: `Context7 answered: ${first.text.slice(0, 300)}` };
  const id = /\/[\w.-]+\/[\w.-]+/.exec(first.text)?.[0];
  return id ? { ok: true, detail: `Context7 answered with ${id}` } : { ok: false, detail: `no library ID in Context7's answer: ${first.text.slice(0, 300)}` };
}

/** Whether the Context7 MCP server was connected when the session started (undefined if not configured). */
export function context7Connected(events: unknown[]): boolean | undefined {
  const init = (events as Event[]).find((e) => e.type === "system" && e.subtype === "init");
  const server = init?.mcp_servers?.find((s) => s.name === "context7");
  return server ? server.status === "connected" : undefined;
}

// ---------------------------------------------------------------------------
// Context7 keys

/**
 * Context7 API keys shared out across a run's sessions, by index (run.ts holds the keys themselves).
 * A session holds a reservation on its key while it runs, so concurrent sessions can't overdraw one;
 * when it ends, the calls it made replace the reservation. Sessions in held-out v1 made 1–9 calls.
 */
export class Context7Keys {
  private readonly keys: Array<{ remaining: number; reserved: number }>;

  constructor(
    remaining: number[],
    private readonly reserve = 10,
  ) {
    this.keys = remaining.map((r) => ({ remaining: r, reserved: 0 }));
  }

  /** The key with the most calls left after reservations, reserved for one session; undefined if none has room. */
  acquire(): number | undefined {
    const free = (i: number) => this.keys[i].remaining - this.keys[i].reserved;
    let best: number | undefined;
    for (let i = 0; i < this.keys.length; i++) if (free(i) >= this.reserve && (best === undefined || free(i) > free(best))) best = i;
    if (best !== undefined) this.keys[best].reserved += this.reserve;
    return best;
  }

  /** The session on key `i` ended after `calls` Context7 calls. */
  release(i: number, calls: number): void {
    const k = this.keys[i];
    k.reserved = Math.max(0, k.reserved - this.reserve);
    k.remaining = Math.max(0, k.remaining - calls);
  }

  /** What Context7's usage endpoint says key `i` has left (after it turned a call away). */
  setRemaining(i: number, remaining: number): void {
    this.keys[i].remaining = remaining;
  }

  /** Calls left across all keys. */
  get left(): number {
    return this.keys.reduce((s, k) => s + k.remaining, 0);
  }

  /** Whether a running session still holds a reservation (and may hand calls back). */
  get busy(): boolean {
    return this.keys.some((k) => k.reserved > 0);
  }
}

// ---------------------------------------------------------------------------
// Merging shards

export interface BuildLine {
  suite: string;
  model: string;
  tasks: string[];
  arms: string[];
  modes: string[];
  reps: number;
  examples: boolean;
  commit: string;
  distSha256: string | null;
  shard?: string;
  claudeVersion?: string;
  templates?: Record<string, string | null>;
}

const readLines = async <T>(file: string): Promise<T[]> =>
  (await readFile(file, "utf8")).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as T);

/**
 * Check that shard folders are one run split n ways (same build, Claude Code, template installs,
 * run settings and notes; every session there once) and write them to `out` as one results folder.
 * Returns the merged rows; run.ts writes report.md.
 */
export async function mergeShards<R extends { runId: string }>(out: string, dirs: string[]): Promise<R[]> {
  if (existsSync(join(out, "results.jsonl"))) throw new Error(`${out} already has results.jsonl; merge into a new folder`);
  const shards = await Promise.all(
    dirs.map(async (dir) => {
      for (const f of ["build.jsonl", "results.jsonl"]) if (!existsSync(join(dir, f))) throw new Error(`${dir} has no ${f}`);
      return { dir, builds: await readLines<BuildLine>(join(dir, "build.jsonl")), rows: await readLines<R>(join(dir, "results.jsonl")) };
    }),
  );
  const all = shards.flatMap((s) => s.builds.map((b) => ({ dir: s.dir, b })));
  const same = (what: string, key: (b: BuildLine) => unknown) => {
    const seen = new Map<string, string[]>();
    for (const { dir, b } of all) {
      const k = JSON.stringify(key(b) ?? null);
      seen.set(k, [...(seen.get(k) ?? []), dir]);
    }
    if (seen.size > 1) throw new Error(`shards differ in ${what}: ${[...seen].map(([k, ds]) => `${k} in ${[...new Set(ds)].join(", ")}`).join("; ")}`);
  };
  same("stalemap commit", (b) => b.commit);
  same("dist hash", (b) => b.distSha256);
  same("Claude Code version", (b) => b.claudeVersion);
  same("template installs", (b) => b.templates);
  same("run settings", (b) => [b.suite, b.model, b.tasks, b.arms, b.modes, b.reps, b.examples]);

  const specs = shards.map((s) => {
    const own = [...new Set(s.builds.map((b) => b.shard))];
    if (own.length !== 1 || !own[0]) throw new Error(`${s.dir} isn't one shard (shard ${own.join(", ") || "none"})`);
    return parseShard(own[0]);
  });
  const count = specs[0].count;
  const indexes = specs.map((s) => s.index).sort((a, b) => a - b);
  if (specs.some((s) => s.count !== count) || indexes.join() !== Array.from({ length: count }, (_, i) => i + 1).join()) {
    throw new Error(`need shards 1..${count} once each, got ${specs.map((s) => `${s.index}/${s.count}`).join(", ")}`);
  }

  const b = all[0].b;
  const jobs = jobList(b.tasks, b.arms, b.modes, b.reps);
  const rows: R[] = [];
  const seen = new Set<string>();
  for (const [i, s] of shards.entries()) {
    const expected = new Set(shardJobs(jobs, specs[i]).map((j) => runIdOf(b.suite, j)));
    for (const r of s.rows) {
      if (!expected.has(r.runId)) throw new Error(`${s.dir}: ${r.runId} doesn't belong to shard ${specs[i].index}/${count}`);
      if (seen.has(r.runId)) throw new Error(`${s.dir}: ${r.runId} appears twice`);
      seen.add(r.runId);
      rows.push(r);
    }
    const missing = [...expected].filter((id) => !seen.has(id));
    if (missing.length) throw new Error(`${s.dir} is missing ${missing.length} sessions (e.g. ${missing.slice(0, 3).join(", ")}); finish it with --resume first`);
  }

  // The notes are generated on each machine: the arms must have seen the same text everywhere.
  await mkdir(out, { recursive: true });
  const notes = [...new Set((await Promise.all(dirs.map((d) => readdir(d)))).flat().filter((f) => /^stalemap-notes.*\.md$/.test(f)))];
  for (const f of notes) {
    const texts = await Promise.all(dirs.map(async (d) => (existsSync(join(d, f)) ? readFile(join(d, f), "utf8") : undefined)));
    if (new Set(texts).size !== 1 || texts[0] === undefined) throw new Error(`${f} differs between shards (or is missing from one)`);
    await writeFile(join(out, f), texts[0]);
  }
  for (const d of dirs) if (existsSync(join(d, "runs"))) await cp(join(d, "runs"), join(out, "runs"), { recursive: true });
  await writeFile(join(out, "build.jsonl"), all.map(({ b }) => JSON.stringify(b) + "\n").join(""));
  await writeFile(join(out, "results.jsonl"), rows.map((r) => JSON.stringify(r) + "\n").join(""));
  return rows;
}

/**
 * `--mcp-config` for the stalemap-full arm: the build under test (`node <cli> mcp`) serving one
 * workspace for the session's model, on the harness's cache (`STALEMAP_CACHE`, if it sets one).
 */
export function stalemapMcpConfig(cli: string, dir: string, model: string, cache?: string): { mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }> } {
  const env: Record<string, string> = { STALEMAP_MODEL: model, ...(cache ? { STALEMAP_CACHE: cache } : {}) };
  return { mcpServers: { stalemap: { command: process.execPath, args: [cli, "mcp", "--cwd", dir, "--model", model], env } } };
}
