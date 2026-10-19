import { existsSync } from "node:fs";
import { appendFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import semver from "semver";
import { readBlock } from "./block.js";
import { MAX_EDIT_NOTES, noteFingerprint } from "./editnotes.js";
import { guardFile, guardMessage, type GuardFinding, type GuardResult } from "./guard.js";
import { prepareProject, runStalemap } from "./index.js";
import { detectModel, resolveModel } from "./models.js";
import { CURSOR_STOP_LOOP_LIMIT } from "./setup.js";
import { cacheDir, readJson, setLogLevel, writeJsonAtomic } from "./util.js";

/** SessionStart context is capped at 10,000 characters by Claude Code. */
const MAX_CONTEXT_CHARS = 9000;
const HOOK_DEADLINE_MS = 45_000;

interface SessionStartInput {
  cwd?: string;
  model?: string;
  source?: string;
  session_id?: string;
}

/** PostToolUse input doesn't carry the model, so SessionStart remembers it per session. */
const sessionFile = (id: string) => join(cacheDir(), "sessions", `${id.replace(/[^\w-]/g, "_")}.json`);

async function readStdin(timeoutMs: number): Promise<string> {
  if (process.stdin.isTTY) return "";
  return new Promise((done) => {
    let data = "";
    const timer = setTimeout(() => done(data), timeoutMs);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      clearTimeout(timer);
      done(data);
    });
  });
}

/**
 * The notes are already in context when CLAUDE.md carries a current block (Claude Code
 * loads CLAUDE.md), or imports an AGENTS.md that does.
 */
async function alreadyInContext(cwd: string, hash: string): Promise<boolean> {
  const claude = await readBlock(join(cwd, "CLAUDE.md"));
  if (claude.hash === hash) return true;
  if (claude.text?.includes("@AGENTS.md")) {
    const agents = await readBlock(join(cwd, "AGENTS.md"));
    if (agents.hash === hash) return true;
  }
  return false;
}

/**
 * `stalemap hook session-start`: print the notes as SessionStart `additionalContext`.
 * A hook must never break a session, so every failure ends silently with exit 0.
 */
export async function sessionStartHook(fallbackCwd: string, budget: number): Promise<void> {
  setLogLevel({ quiet: !process.env.STALEMAP_DEBUG });
  let input: SessionStartInput = {};
  try {
    const raw = await readStdin(2000);
    if (raw.trim()) input = JSON.parse(raw) as SessionStartInput;
  } catch {
    // no or invalid input: fall back to defaults
  }
  const cwd = resolve(input.cwd ?? fallbackCwd);
  if (input.session_id && input.model) await writeJsonAtomic(sessionFile(input.session_id), { model: input.model, at: Date.now() }).catch(() => {});
  if (!existsSync(join(cwd, "package.json"))) return;

  const work = (async () => {
    // The plugin and `stalemap setup --agent claude` install this hook together with the guard.
    const opts = { cwd, model: input.model || undefined, budget, guard: true };
    let prepared;
    try {
      prepared = await prepareProject(opts);
    } catch {
      // Model unknown to the catalog: retry with whatever the settings say.
      prepared = await prepareProject({ ...opts, model: undefined });
    }
    if (await alreadyInContext(cwd, prepared.hash)) return;
    const { rendered, reports } = await runStalemap(opts, prepared);
    if (!reports.some((r) => r.status === "changed" || r.status === "new")) return;
    // The guard's edit-time notes skip what the block already says.
    if (input.session_id) await writeJsonAtomic(sessionFile(input.session_id), { model: input.model, at: Date.now(), block: rendered.block }).catch(() => {});
    const context = rendered.block.length > MAX_CONTEXT_CHARS ? rendered.block.slice(0, MAX_CONTEXT_CHARS) + "\n…" : rendered.block;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } }) + "\n");
  })();

  const deadline = new Promise<void>((done) => setTimeout(done, HOOK_DEADLINE_MS).unref());
  try {
    await Promise.race([work, deadline]);
  } catch (err) {
    if (process.env.STALEMAP_DEBUG) process.stderr.write(`stalemap hook: ${(err as Error).message}\n`);
  }
}

// ── Edit-time notes: each once per session, and not what the notes block says ──

const notesShownFile = (id: string) => join(cacheDir(), "sessions", `${id.replace(/[^\w-]/g, "_")}.notes.json`);
const normalized = (text: string) => text.replace(/[^\p{L}\p{N}]+/gu, " ").toLowerCase();

/** The notes block the agent already has: CLAUDE.md, AGENTS.md, the session's SessionStart context or $STALEMAP_NOTES_FILE. */
async function blockInContext(cwd: string, sessionId?: string): Promise<string> {
  const parts = await Promise.all([
    process.env.STALEMAP_NOTES_FILE ? readFile(process.env.STALEMAP_NOTES_FILE, "utf8").catch(() => "") : "",
    ...["CLAUDE.md", "AGENTS.md"].map(async (f) => (await readBlock(join(cwd, f))).block ?? ""),
    sessionId ? readJson<{ block?: string }>(sessionFile(sessionId)).then((s) => s?.block ?? "") : "",
  ]);
  return normalized(parts.join("\n"));
}

/** Drop edit-time notes the block or an earlier edit in this session showed; keep a few and remember them. */
export async function freshNotes(result: GuardResult | undefined, cwd: string, sessionId?: string): Promise<GuardResult | undefined> {
  if (!result?.notes?.length) return result;
  const block = await blockInContext(cwd, sessionId);
  const shown = new Set(sessionId ? ((await readJson<string[]>(notesShownFile(sessionId))) ?? []) : []);
  const fresh = result.notes.filter((n) => !shown.has(n.key) && !block.includes(noteFingerprint(n.text))).slice(0, MAX_EDIT_NOTES);
  if (sessionId && fresh.length) await writeJsonAtomic(notesShownFile(sessionId), [...shown, ...fresh.map((n) => n.key)]).catch(() => {});
  return { ...result, notes: fresh };
}

const GUARD_DEADLINE_MS = 25_000;
/** apply_patch can touch many files; type-checking each takes a moment. */
const MAX_GUARDED_FILES = 5;

export const HOOK_AGENTS = ["claude", "cursor", "codex", "opencode"] as const;
export type HookAgent = (typeof HOOK_AGENTS)[number];

/** What the guard needs from a post-edit hook payload, whichever agent sent it. */
export interface EditEvent {
  files: string[];
  cwd?: string;
  /** Model ids the payload names, best first (may be agent-specific slugs). */
  models: string[];
  sessionId?: string;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
const defined = <T>(xs: (T | undefined)[]): T[] => xs.filter((x): x is T => x !== undefined);

/** Files an apply_patch patch adds, updates or moves to (`*** Update File: src/a.ts`). Deleted files are skipped. */
export function patchFiles(patch: string | undefined): string[] {
  if (!patch) return [];
  return [...new Set([...patch.matchAll(/^\*\*\* (?:Add File|Update File|Move to): (.+?)\s*$/gm)].map((m) => m[1]!))];
}

/**
 * Read a post-edit payload.
 * - claude: PostToolUse for Write|Edit, `tool_input.file_path` (https://code.claude.com/docs/en/hooks)
 * - codex: PostToolUse; edits arrive as `apply_patch` with the patch in `tool_input.command`, plus
 *   `model` and `cwd` (https://learn.chatgpt.com/docs/hooks)
 * - cursor: postToolUse for Write (`tool_input`'s path field isn't documented, so several names are
 *   tried) or afterFileEdit (`file_path`); `model`/`model_id`, `cwd` or `workspace_roots`
 *   (https://cursor.com/docs/hooks)
 * - opencode: what the plugin `stalemap setup --agent opencode` writes sends from `tool.execute.after`:
 *   `{ tool, args, cwd, model, sessionID }`; edit/write take `args.filePath`, apply_patch `args.patchText`
 */
export function parseEditEvent(agent: HookAgent, input: any): EditEvent {
  const ti = input?.tool_input && typeof input.tool_input === "object" ? input.tool_input : {};
  switch (agent) {
    case "claude":
      return { files: defined([str(ti.file_path)]), cwd: str(input?.cwd), models: [], sessionId: str(input?.session_id) };
    case "codex":
      return {
        files: input?.tool_name === "apply_patch" ? patchFiles(str(ti.command) ?? str(ti.patch) ?? str(ti.input)) : defined([str(ti.file_path) ?? str(ti.path)]),
        cwd: str(input?.cwd),
        models: defined([str(input?.model)]),
        sessionId: str(input?.session_id),
      };
    case "cursor":
      // Only afterFileEdit's `file_path` is documented; the postToolUse names are guesses. That's one
      // reason setup keeps the afterFileEdit hook logging edits for the stop hook.
      return {
        files: defined([str(ti.file_path) ?? str(ti.path) ?? str(ti.target_file) ?? str(ti.filePath) ?? str(input?.file_path)]),
        cwd: str(input?.cwd) ?? str(input?.workspace_roots?.[0]) ?? str(process.env.CURSOR_PROJECT_DIR),
        models: defined([str(input?.model_id), str(input?.model)]),
        sessionId: str(input?.conversation_id),
      };
    case "opencode": {
      const args = input?.args && typeof input.args === "object" ? input.args : {};
      return {
        files: str(args.patchText) ? patchFiles(args.patchText) : defined([str(args.filePath) ?? str(args.path) ?? str(args.file_path)]),
        cwd: str(input?.cwd),
        models: defined([str(input?.model)]),
        sessionId: str(input?.sessionID),
      };
    }
  }
}

/** The hook's stdout for each agent, carrying the guard's message to the model. */
export function guardHookOutput(agent: HookAgent, context: string): string {
  switch (agent) {
    case "cursor":
      return JSON.stringify({ additional_context: context });
    case "opencode":
      return JSON.stringify({ additionalContext: context });
    default:
      return JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } });
  }
}

/** First model id the catalog knows. Agent slugs (Cursor's "auto") fall through to detection. */
async function knownModel(candidates: string[], cwd: string): Promise<string | undefined> {
  for (const model of candidates) {
    try {
      await resolveModel({ model, cwd, useCache: true });
      return model;
    } catch {
      // unknown to the catalog: try the next one
    }
  }
  return undefined;
}

/**
 * The model to check against: $STALEMAP_MODEL, the payload's if the catalog knows it, the one
 * SessionStart remembered, else the agent's own settings. guardFile's fallback detection doesn't know
 * which agent is asking, so $ANTHROPIC_MODEL or Claude Code's settings would win over Codex's.
 */
async function pickModel(agent: HookAgent, event: Pick<EditEvent, "models" | "sessionId">, cwd: string): Promise<string | undefined> {
  if (process.env.STALEMAP_MODEL) return process.env.STALEMAP_MODEL;
  const known = await knownModel(event.models, cwd);
  if (known) return known;
  const remembered = event.sessionId ? await readJson<{ model?: string }>(sessionFile(event.sessionId)) : undefined;
  if (remembered?.model) return remembered.model;
  return agent === "claude" ? undefined : (await detectModel(cwd, agent))?.model;
}

/**
 * Run `step` on each item in turn until `ms` runs out, and return the results that finished in time,
 * so findings for the files checked before a deadline aren't lost with the one still running.
 */
export async function untilDeadline<T, R>(items: T[], ms: number, step: (item: T) => Promise<R>): Promise<R[]> {
  const done: R[] = [];
  const work = (async () => {
    for (const item of items) done.push(await step(item));
  })();
  const deadline = new Promise<void>((ok) => setTimeout(ok, ms).unref());
  try {
    await Promise.race([work, deadline]);
  } catch (err) {
    if (process.env.STALEMAP_DEBUG) process.stderr.write(`stalemap guard: ${(err as Error).message}\n`);
  }
  return done.slice();
}

/**
 * `stalemap hook post-edit [--agent <name>]`: after an edit, type-check the file against the installed
 * versions and tell the agent about APIs it used that changed after its training cutoff. Silent
 * otherwise, and never fails the tool call.
 */
export async function postEditHook(fallbackCwd: string, agent: HookAgent = "claude"): Promise<void> {
  setLogLevel({ quiet: !process.env.STALEMAP_DEBUG });
  let event: EditEvent;
  try {
    const raw = await readStdin(2000);
    event = parseEditEvent(agent, raw.trim() ? JSON.parse(raw) : {});
  } catch {
    return;
  }
  if (!event.files.length) return;
  const cwd = resolve(event.cwd ?? fallbackCwd);
  // The edit goes in the log first: the stop hook guards it again if this run's findings get lost.
  if (agent === "cursor") await recordCursorEdits(event, cwd);

  const deadlineAt = Date.now() + GUARD_DEADLINE_MS;
  const left = () => Math.max(0, deadlineAt - Date.now());
  const [model] = await untilDeadline([event], left(), (e) => pickModel(agent, e, cwd));
  // An apply_patch can touch several files: what's found before the deadline is still reported.
  const found = await untilDeadline(event.files.slice(0, MAX_GUARDED_FILES), left(), async (file) => {
    const result = await freshNotes(await guardFile({ cwd, file, model, deprecations: process.env.STALEMAP_GUARD_DEPRECATIONS === "1", session: event.sessionId }), cwd, event.sessionId);
    const message = guardMessage(result, cwd, SHOWN_PER_FILE);
    if (process.env.STALEMAP_GUARD_LOG) {
      const entry = { at: new Date().toISOString(), agent, file, findings: result?.findings.length ?? 0, notes: result?.notes?.length ?? 0, message };
      await appendFile(process.env.STALEMAP_GUARD_LOG, JSON.stringify(entry) + "\n").catch(() => {});
    }
    return { message, shown: message && result ? shownKeys(result) : [] };
  });
  const messages = found.map((f) => f.message).filter(Boolean);
  if (!messages.length) return;
  const output = guardHookOutput(agent, messages.join("\n\n").slice(0, MAX_CONTEXT_CHARS));
  if (agent === "cursor") {
    if (event.sessionId) await appendCursorLog(event.sessionId, [{ shown: found.flatMap((f) => f.shown) }]).catch(() => {});
    await writeForCursor(output);
  } else process.stdout.write(output + "\n");
}

// ── Cursor: the guard's findings as a follow-up when the agent stops ────────

/*
 * Cursor accepts postToolUse `additional_context` but doesn't pass it to the model yet
 * (https://forum.cursor.com/t/155689, still open in 3.7.36). The fallback: afterFileEdit and
 * postToolUse log each edited file per conversation, and the stop hook guards the files edited since
 * the last stop and sends the findings as `followup_message`, which Cursor submits as the next user
 * message (https://cursor.com/docs/hooks#stop). `loop_limit` in .cursor/hooks.json caps the chain.
 *
 * Nothing is reported twice: stop skips findings an earlier stop sent, and findings postToolUse
 * showed once Cursor passes them to the model. Findings the agent fixed are gone when stop re-checks.
 */

/** First Cursor version whose postToolUse `additional_context` reaches the model. None yet. */
export const CURSOR_CONTEXT_FIXED_IN: string | undefined = undefined;
/** guardMessage's default: findings listed per file. */
const SHOWN_PER_FILE = 8;
/** Files guarded per stop, most recently edited first; the rest wait for the next stop. */
const MAX_STOP_FILES = 10;
const STOP_DEADLINE_MS = 45_000;
const CURSOR_LOG_MAX_AGE_MS = 14 * 86_400_000;

const cursorLogDir = () => join(cacheDir(), "cursor");
const cursorLog = (conversationId: string) => join(cursorLogDir(), `${conversationId.replace(/[^\w-]/g, "_")}.jsonl`);

/** One line per event, appended: concurrent hooks don't overwrite each other. */
type CursorLogEntry = { edited: string } | { shown: string[] } | { checked: string[]; reported: string[] };

async function appendCursorLog(conversationId: string, entries: CursorLogEntry[]): Promise<void> {
  if (!entries.length) return;
  const file = cursorLog(conversationId);
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, entries.map((e) => JSON.stringify(e) + "\n").join(""));
}

async function recordCursorEdits(event: EditEvent, cwd: string): Promise<void> {
  if (!event.sessionId) return;
  await appendCursorLog(event.sessionId, event.files.map((f) => ({ edited: resolve(cwd, f) }))).catch(() => {});
}

/** A finding's identity across runs: line numbers move as the agent edits. */
export const findingKey = (file: string, f: GuardFinding) => [file, f.pkg, f.problem].join("\n");
const shownKeys = (result: GuardResult) => result.findings.slice(0, SHOWN_PER_FILE).map((f) => findingKey(result.file, f));

export interface CursorLedger {
  /** Files edited since a stop last checked them, oldest edit first. */
  pending: string[];
  /** Findings a stop follow-up already sent. */
  reported: Set<string>;
  /** Findings postToolUse put in `additional_context`. */
  shown: Set<string>;
}

export function readCursorLedger(text: string): CursorLedger {
  const pending = new Set<string>();
  const reported = new Set<string>();
  const shown = new Set<string>();
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  for (const line of text.split("\n")) {
    let e: any;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof e?.edited === "string") {
      pending.delete(e.edited);
      pending.add(e.edited);
    }
    for (const f of strings(e?.checked)) pending.delete(f);
    for (const k of strings(e?.reported)) reported.add(k);
    for (const k of strings(e?.shown)) shown.add(k);
  }
  return { pending: [...pending], reported, shown };
}

/** Whether this Cursor version passes postToolUse `additional_context` to the model. */
export function cursorContextWorks(version: string | undefined, fixedIn = CURSOR_CONTEXT_FIXED_IN): boolean {
  const v = semver.coerce(version);
  return !!(fixedIn && v && semver.gte(v, fixedIn));
}

/** The findings the agent hasn't been told about. */
export function unreportedFindings(result: GuardResult, ledger: CursorLedger, contextWorks: boolean): GuardFinding[] {
  return result.findings.filter((f) => {
    const key = findingKey(result.file, f);
    return !ledger.reported.has(key) && !(contextWorks && ledger.shown.has(key));
  });
}

export function cursorFollowup(messages: string[]): string {
  return [
    "[Automated message from stalemap's Cursor stop hook, not from the user.] It re-checked the files you edited against the installed dependency versions:",
    messages.join("\n\n").slice(0, MAX_CONTEXT_CHARS),
    "If a finding doesn't apply, say so in one line instead of changing the code.",
  ].join("\n\n");
}

/** Cursor can miss the output of a hook that exits right after writing it (https://forum.cursor.com/t/165818). */
async function writeForCursor(json: string): Promise<void> {
  await new Promise<void>((done) => process.stdout.write(json + "\n", () => done()));
  await new Promise((done) => setTimeout(done, 50));
}

async function readCursorInput(): Promise<any> {
  try {
    const raw = await readStdin(2000);
    const input = raw.trim() ? JSON.parse(raw) : {};
    return input && typeof input === "object" ? input : {};
  } catch {
    return {};
  }
}

/** `stalemap hook record-edit --agent cursor` (afterFileEdit): log the edited file for the stop hook. */
export async function cursorRecordEditHook(fallbackCwd: string): Promise<void> {
  const event = parseEditEvent("cursor", await readCursorInput());
  await recordCursorEdits(event, resolve(event.cwd ?? fallbackCwd));
}

/**
 * `stalemap hook stop --agent cursor`: guard the files edited since the last stop and send the
 * findings the agent hasn't seen as a follow-up message. Silent when there are none.
 */
export async function cursorStopHook(fallbackCwd: string): Promise<void> {
  setLogLevel({ quiet: !process.env.STALEMAP_DEBUG });
  const input = await readCursorInput();
  const id = str(input.conversation_id);
  // Aborted or failed turns: don't auto-continue; the edits wait for the next stop.
  if (!id || input.status !== "completed") return;
  const cwd = resolve(str(input.cwd) ?? str(input.workspace_roots?.[0]) ?? str(process.env.CURSOR_PROJECT_DIR) ?? fallbackCwd);
  // Past loop_limit Cursor drops the follow-up, so its findings must stay unreported for the next stop.
  const loops = typeof input.loop_count === "number" ? input.loop_count : 0;
  if (loops >= (await cursorStopLoopLimit(cwd))) return;
  const ledger = readCursorLedger(await readFile(cursorLog(id), "utf8").catch(() => ""));
  if (!ledger.pending.length) return;
  const contextWorks = cursorContextWorks(str(input.cursor_version) ?? str(process.env.CURSOR_VERSION));

  const done: { file: string; message: string; keys: string[] }[] = [];
  const work = (async () => {
    const model = await pickModel("cursor", { models: defined([str(input.model_id), str(input.model)]), sessionId: id }, cwd);
    for (const file of ledger.pending.slice(-MAX_STOP_FILES).reverse()) {
      const result = await freshNotes(await guardFile({ cwd, file, model, deprecations: process.env.STALEMAP_GUARD_DEPRECATIONS === "1", session: id }), cwd, id);
      const fresh = result ? unreportedFindings(result, ledger, contextWorks) : [];
      const message = result ? guardMessage({ ...result, findings: fresh }, cwd, SHOWN_PER_FILE) : "";
      done.push({ file, message, keys: message ? shownKeys({ ...result!, findings: fresh }) : [] });
    }
  })();
  const deadline = new Promise<void>((resolveDeadline) => setTimeout(resolveDeadline, STOP_DEADLINE_MS).unref());
  try {
    await Promise.race([work, deadline]);
  } catch (err) {
    if (process.env.STALEMAP_DEBUG) process.stderr.write(`stalemap stop hook: ${(err as Error).message}\n`);
  }

  // Only the files guarded before the deadline count as checked.
  const finished = done.slice();
  if (!finished.length) return;
  const messages = finished.map((d) => d.message).filter(Boolean);
  try {
    await appendCursorLog(id, [{ checked: finished.map((d) => d.file), reported: finished.flatMap((d) => d.keys) }]);
  } catch {
    // Without the log entry the same findings would come back at the next stop: send nothing.
    return;
  }
  if (messages.length) await writeForCursor(JSON.stringify({ followup_message: cursorFollowup(messages) }));
  await pruneCursorLogs().catch(() => {});
}

/**
 * The stop hook's `loop_limit`: `loop_count` counts the follow-ups it already triggered, from 0, and
 * Cursor sends none once the count reaches the limit (default 5; null means no cap).
 * https://cursor.com/docs/hooks#stop
 */
export async function cursorStopLoopLimit(cwd: string, home = homedir()): Promise<number> {
  for (const f of [join(cwd, ".cursor", "hooks.json"), join(home, ".cursor", "hooks.json")]) {
    const stops = (await readJson<{ hooks?: { stop?: unknown } }>(f))?.hooks?.stop;
    const ours = Array.isArray(stops) ? stops.find((h) => typeof h?.command === "string" && /stalemap/.test(h.command) && /\bhook stop\b/.test(h.command)) : undefined;
    if (!ours) continue;
    if (ours.loop_limit === null) return Infinity;
    return typeof ours.loop_limit === "number" ? ours.loop_limit : 5;
  }
  return CURSOR_STOP_LOOP_LIMIT; // configured where we can't read it (team or enterprise hooks)
}

async function pruneCursorLogs(): Promise<void> {
  const dir = cursorLogDir();
  for (const name of await readdir(dir)) {
    const file = join(dir, name);
    if (Date.now() - (await stat(file)).mtimeMs > CURSOR_LOG_MAX_AGE_MS) await rm(file, { force: true });
  }
}
