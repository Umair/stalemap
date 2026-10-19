import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { applyBlock, defaultTarget, readBlock, sameBlock } from "./block.js";
import { parseJsonc } from "./jsonc.js";

export { parseJsonc };

/**
 * `stalemap setup --agent <name>`: give an agent what the Claude Code plugin gives Claude Code,
 * as project files: the notes block, the MCP server and the post-edit guard.
 *
 * Re-running changes nothing. Config files are merged, never replaced: entries stalemap didn't
 * write are kept as they are, and a file that can't be rewritten safely (JSONC with comments) is
 * left alone with instructions to add the entry by hand.
 */

export const SETUP_AGENTS = ["cursor", "codex", "opencode", "claude"] as const;
export type SetupAgent = (typeof SETUP_AGENTS)[number];

export const AGENT_NAMES: Record<SetupAgent, string> = { cursor: "Cursor", codex: "Codex", opencode: "OpenCode", claude: "Claude Code" };

const PKG = "stalemap@latest";
const MCP_COMMAND = ["npx", "-y", PKG, "mcp"];
/** The guard command each agent runs after an edit. Claude Code's payload is the default. */
export const guardCommand = (agent: SetupAgent) => ["npx", "-y", PKG, "hook", "post-edit", ...(agent === "claude" ? [] : ["--agent", agent])];
const GUARD_TIMEOUT_S = 60;
/** Follow-up messages the Cursor stop hook may send in a row (its `loop_limit`; Cursor's default is 5). */
export const CURSOR_STOP_LOOP_LIMIT = 2;

export type ChangeAction = "create" | "update" | "unchanged" | "skipped";

export interface SetupChange {
  /** Path relative to the project. */
  file: string;
  action: ChangeAction;
  what: string;
  detail?: string;
}

export interface SetupResult {
  agent: SetupAgent;
  changes: SetupChange[];
  /** New contents of every file that changes (path relative to the project), for --dry-run. */
  files: Map<string, string>;
  /** What the user should know: the agent's own approval steps, caveats. */
  notes: string[];
}

export type NotesRenderer = (target: string) => Promise<{ block: string; detail?: string; note?: string } | { skip: string }>;

export interface SetupOptions {
  agent: SetupAgent;
  cwd: string;
  dryRun?: boolean;
  /** Notes file, relative to cwd (default: the file the agent reads). */
  target?: string;
  /** Renders the notes block for the target file. Without it the notes are skipped. */
  renderNotes?: NotesRenderer;
  /** Home directory, for detecting an installed Claude Code plugin (tests override it). */
  home?: string;
}

export async function setupAgent(opts: SetupOptions): Promise<SetupResult> {
  const files = new ProjectFiles(opts.cwd);
  const notes: string[] = [];
  const changes: SetupChange[] = [];
  const steps = AGENTS[opts.agent];

  changes.push(await notesStep(files, opts, opts.target ?? (await steps.notesFile(opts.cwd)), notes));
  changes.push(...(await steps.mcp(files)));
  if (steps.guard) changes.push(...(await steps.guard(files)));
  else changes.push({ file: "-", action: "skipped", what: "post-edit guard", detail: `${AGENT_NAMES[opts.agent]} has no hook that runs after file edits` });
  notes.push(...(await steps.notes(opts)));

  const changed = files.changed();
  if (!opts.dryRun) {
    for (const [rel, text] of changed) {
      await mkdir(dirname(join(opts.cwd, rel)), { recursive: true });
      await writeFile(join(opts.cwd, rel), text);
    }
  }
  return { agent: opts.agent, changes, files: new Map(changed), notes };
}

interface AgentSteps {
  notesFile(cwd: string): Promise<string>;
  mcp(files: ProjectFiles): Promise<SetupChange[]>;
  guard?(files: ProjectFiles): Promise<SetupChange[]>;
  notes(opts: SetupOptions): Promise<string[]>;
}

const AGENTS: Record<SetupAgent, AgentSteps> = {
  // Rules: https://cursor.com/docs/context/rules ("Cursor supports AGENTS.md in the project root and subdirectories")
  // MCP:   https://cursor.com/docs/context/mcp (.cursor/mcp.json, `mcpServers`)
  // Hooks: https://cursor.com/docs/hooks (.cursor/hooks.json; postToolUse can return `additional_context`,
  //        afterFileEdit can't return anything, stop can return `followup_message`)
  cursor: {
    notesFile: async () => "AGENTS.md",
    mcp: (files) =>
      editJson(files, ".cursor/mcp.json", "MCP server", (cfg) =>
        addMcpServer(cfg, "mcpServers", { type: "stdio", command: MCP_COMMAND[0], args: MCP_COMMAND.slice(1) }, (s) => [s.command, ...(s.args ?? [])]),
      ),
    guard: (files) =>
      editJson(files, ".cursor/hooks.json", "post-edit guard (postToolUse: Write; afterFileEdit and stop as the fallback)", (cfg) => {
        cfg.version ??= 1;
        const hooks = objectAt(cfg, "hooks");
        for (const [event, { sub, hook }] of Object.entries(CURSOR_HOOKS)) upsertFlatHook(hooks, event, hook, sub);
      }),
    notes: async () => [
      "Cursor documents `additional_context` from postToolUse hooks, but it doesn't reach the model yet (https://forum.cursor.com/t/native-posttooluse-hooks-accept-and-log-additional-context-successfully-but-the-injected-context-is-not-surfaced-to-the-model/155689, still open in Cursor 3.7). So the afterFileEdit hook also logs each edited file, and when the agent finishes a turn the stop hook re-checks those files and sends what's still wrong as a follow-up message, which Cursor submits as the next prompt.",
    ],
  },

  // Instructions: https://learn.chatgpt.com/docs/agent-configuration/agents-md (AGENTS.override.md wins over AGENTS.md in a directory)
  // MCP:   https://learn.chatgpt.com/docs/extend/mcp ([mcp_servers.<name>] in .codex/config.toml, trusted projects only)
  // Hooks: https://learn.chatgpt.com/docs/hooks (.codex/hooks.json or [hooks] in config.toml; PostToolUse
  //        reports edits as `apply_patch` and accepts hookSpecificOutput.additionalContext)
  codex: {
    notesFile: async (cwd) => (existsSync(join(cwd, "AGENTS.override.md")) ? "AGENTS.override.md" : "AGENTS.md"),
    mcp: async (files) => [await codexMcp(files)],
    guard: async (files) => [await codexGuard(files)],
    notes: async (opts) => {
      const out = ["Codex reads `.codex/` only in trusted projects, and runs a new or changed hook only after you review it with /hooks."];
      const home = opts.home ?? homedir();
      for (const f of [join(opts.cwd, ".codex", "config.toml"), join(home, ".codex", "config.toml")]) {
        const on = codexHooksSetting(await readFile(f, "utf8").catch(() => ""));
        if (on === undefined) continue;
        if (!on) out.push(`Hooks are switched off in ${f.replace(home, "~")} (\`hooks = false\` under [features]), so Codex won't run the guard until you turn them back on.`);
        break;
      }
      return out;
    },
  },

  // Instructions: https://opencode.ai/docs/rules/ (AGENTS.md; CLAUDE.md only when there's no AGENTS.md)
  // MCP:     https://opencode.ai/docs/mcp-servers/ (`mcp` in opencode.json, type "local", command array)
  // Plugins: https://opencode.ai/docs/plugins/ (.opencode/plugins/*.js load at startup; `tool.execute.after`)
  opencode: {
    notesFile: async (cwd) => (defaultTarget(cwd).endsWith("CLAUDE.md") ? "CLAUDE.md" : "AGENTS.md"),
    mcp: async (files) => {
      const rel = (await files.read("opencode.jsonc")) !== undefined ? "opencode.jsonc" : "opencode.json";
      return editJson(
        files,
        rel,
        "MCP server",
        (cfg) =>
          // `timeout` covers connecting; the default 5 s is too short when npx has to download stalemap first.
          addMcpServer(cfg, "mcp", { type: "local", command: MCP_COMMAND, enabled: true, timeout: 30_000 }, (s) => (Array.isArray(s.command) ? s.command : [])),
        { $schema: "https://opencode.ai/config.json" },
      );
    },
    guard: async (files) => [await writeOwnedFile(files, ".opencode/plugins/stalemap.js", "post-edit guard (plugin)", OPENCODE_PLUGIN)],
    notes: async () => ["OpenCode loads plugins and MCP servers at startup: restart it if it's running."],
  },

  // Without the plugin: https://code.claude.com/docs/en/hooks (.claude/settings.json) and
  // https://code.claude.com/docs/en/mcp (.mcp.json). Same hooks as plugin/hooks/hooks.json.
  claude: {
    notesFile: async (cwd) => {
      const claude = await readFile(join(cwd, "CLAUDE.md"), "utf8").catch(() => "");
      return claude.includes("@AGENTS.md") ? "AGENTS.md" : "CLAUDE.md";
    },
    mcp: (files) =>
      editJson(files, ".mcp.json", "MCP server", (cfg) =>
        addMcpServer(cfg, "mcpServers", { command: MCP_COMMAND[0], args: MCP_COMMAND.slice(1) }, (s) => [s.command, ...(s.args ?? [])]),
      ),
    guard: (files) =>
      editJson(files, ".claude/settings.json", "session-start notes and post-edit guard (PostToolUse: Write|Edit)", (cfg) => {
        const hooks = objectAt(cfg, "hooks");
        for (const [event, group] of Object.entries(CLAUDE_HOOKS)) upsertHookGroup(hooks, event, group, group.hooks[0].args[3]);
      }),
    notes: async (opts) => {
      const out = ["Claude Code asks you to approve the MCP servers in `.mcp.json` the first time it starts in this project."];
      const home = opts.home ?? homedir();
      for (const f of [join(home, ".claude", "settings.json"), join(opts.cwd, ".claude", "settings.json")]) {
        const plugins = parseJsonc(await readFile(f, "utf8").catch(() => ""))?.value?.enabledPlugins ?? {};
        if (Object.entries(plugins).some(([k, on]) => k.startsWith("stalemap@") && on)) {
          out.push(`The stalemap plugin is enabled in ${f.replace(home, "~")}. It already runs these hooks and the MCP server, so with both the guard runs twice: keep one.`);
          break;
        }
      }
      return out;
    },
  },
};

/**
 * Whether an agent in this project runs stalemap's post-edit guard: a hook `stalemap setup` writes,
 * or the Claude Code plugin, which installs one. The notes rank for the guard when it's on.
 */
export async function guardInstalled(cwd: string, home = homedir()): Promise<boolean> {
  const read = (f: string) => readFile(f, "utf8").catch(() => "");
  const hookFiles = [".claude/settings.json", ".claude/settings.local.json", ".cursor/hooks.json", ".codex/hooks.json", ".codex/config.toml"];
  for (const f of hookFiles) if (runsStalemap(await read(join(cwd, f)), "post-edit")) return true;
  if (existsSync(join(cwd, ".opencode", "plugins", "stalemap.js"))) return true;
  for (const f of [join(home, ".claude", "settings.json"), join(cwd, ".claude", "settings.json")]) {
    const plugins = parseJsonc(await read(f))?.value?.enabledPlugins ?? {};
    if (Object.entries(plugins).some(([k, on]) => k.startsWith("stalemap@") && on)) return true;
  }
  return false;
}

/** The Claude Code plugin's hooks (plugin/hooks/hooks.json), as project settings. */
export const CLAUDE_HOOKS = {
  SessionStart: {
    matcher: "startup|clear|compact",
    hooks: [{ type: "command", command: "npx", args: ["-y", PKG, "hook", "session-start"], timeout: 60 }],
  },
  PostToolUse: {
    matcher: "Write|Edit",
    hooks: [{ type: "command", command: "npx", args: guardCommand("claude").slice(1), timeout: GUARD_TIMEOUT_S }],
  },
};

/**
 * Cursor's hooks, by event. postToolUse runs the guard right after the edit. Its findings don't reach
 * the model yet, so afterFileEdit and postToolUse also log each edited file per conversation, and
 * stop guards the files edited since the last stop and sends the findings as `followup_message`.
 */
const cursorHook = (sub: string) => ["npx", "-y", PKG, "hook", sub, "--agent", "cursor"].join(" ");
export const CURSOR_HOOKS = {
  postToolUse: { sub: "post-edit", hook: { command: cursorHook("post-edit"), matcher: "Write", timeout: GUARD_TIMEOUT_S } },
  afterFileEdit: { sub: "record-edit", hook: { command: cursorHook("record-edit"), timeout: 30 } },
  stop: { sub: "stop", hook: { command: cursorHook("stop"), timeout: GUARD_TIMEOUT_S, loop_limit: CURSOR_STOP_LOOP_LIMIT } },
};

const CODEX_HOOK_MATCHER = "apply_patch|Edit|Write";
const codexHookGroup = () => ({
  matcher: CODEX_HOOK_MATCHER,
  hooks: [{ type: "command", command: guardCommand("codex").join(" "), timeout: GUARD_TIMEOUT_S, statusMessage: "stalemap: checking the edit" }],
});

async function codexMcp(files: ProjectFiles): Promise<SetupChange> {
  const rel = ".codex/config.toml";
  const what = "MCP server";
  const text = await files.read(rel);
  const toml = tomlLayout(text ?? "");
  const servers = toml.tables.filter((t) => t.name === "mcp_servers" || t.name.startsWith("mcp_servers."));
  const existing =
    servers.find((t) => t.name === "mcp_servers.stalemap" || t.name.startsWith("mcp_servers.stalemap.") || (t.name !== "mcp_servers" && runsStalemap(t.body, "mcp")))?.name ??
    // `[mcp_servers]` with `stalemap = { … }` or `stalemap.command = …`, or the same as a top-level dotted key
    (servers.some((t) => t.name === "mcp_servers" && tomlKey(t.body, "stalemap")) || tomlKey(toml.top, "mcp_servers.stalemap") ? "mcp_servers.stalemap" : undefined);
  if (existing) return { file: rel, action: "unchanged", what, detail: `[${existing}] already exists` };
  const table = [
    "[mcp_servers.stalemap]",
    `command = ${JSON.stringify(MCP_COMMAND[0])}`,
    `args = [${MCP_COMMAND.slice(1).map((a) => JSON.stringify(a)).join(", ")}]`,
    "# npx may download stalemap on the first start; Codex's default is 10 s.",
    "startup_timeout_sec = 60",
  ].join("\n");
  // An inline `mcp_servers = { … }` can't be extended by a table, and `[[mcp_servers]]` isn't what Codex reads.
  if (tomlKey(toml.top, "mcp_servers", "=") && /stalemap/.test(toml.top)) return { file: rel, action: "unchanged", what, detail: "`mcp_servers` already mentions stalemap" };
  if (servers.some((t) => t.array)) {
    return { file: rel, action: "skipped", what, detail: `\`[[mcp_servers]]\` there is an array of tables, which Codex doesn't read as servers; make it [mcp_servers.<name>] tables and add this:\n${table}` };
  }
  if (tomlKey(toml.top, "mcp_servers", "=")) {
    const entry = `stalemap = { command = ${JSON.stringify(MCP_COMMAND[0])}, args = [${MCP_COMMAND.slice(1).map((a) => JSON.stringify(a)).join(", ")}], startup_timeout_sec = 60 }`;
    return { file: rel, action: "skipped", what, detail: `\`mcp_servers\` is an inline table there, so a table can't be added; add this inside it by hand:\n${entry}` };
  }
  files.set(rel, appendSection(text, table));
  return { file: rel, action: files.existed(rel) ? "update" : "create", what };
}

async function codexGuard(files: ProjectFiles): Promise<SetupChange> {
  const what = `post-edit guard (PostToolUse: ${CODEX_HOOK_MATCHER})`;
  const text = await files.read(".codex/config.toml");
  const toml = tomlLayout(text ?? "");
  const hookTables = toml.tables.filter((t) => t.name === "hooks" || t.name.startsWith("hooks."));
  // One layer shouldn't define hooks both ways (Codex warns), so follow what the project already uses.
  // (`hooks = true` under [features] is a feature flag, not a hook.)
  const tomlHasHooks = hookTables.length > 0 || tomlKey(toml.top, "hooks");
  if (text !== undefined && tomlHasHooks && (await files.read(".codex/hooks.json")) === undefined) {
    const rel = ".codex/config.toml";
    if (runsStalemap([toml.top, ...hookTables.map((t) => t.body)].join("\n"), "post-edit")) return { file: rel, action: "unchanged", what };
    const g = codexHookGroup();
    const h = g.hooks[0];
    const table = [
      "[[hooks.PostToolUse]]",
      `matcher = ${JSON.stringify(g.matcher)}`,
      "",
      "[[hooks.PostToolUse.hooks]]",
      `type = ${JSON.stringify(h.type)}`,
      `command = ${JSON.stringify(h.command)}`,
      `timeout = ${h.timeout}`,
      `statusMessage = ${JSON.stringify(h.statusMessage)}`,
    ].join("\n");
    // [[hooks.PostToolUse]] can only extend an array of tables: not an inline `hooks = { … }`, a
    // `PostToolUse = [ … ]` array under [hooks] (or as a dotted key), or a plain [hooks.PostToolUse] table.
    const inline =
      tomlKey(toml.top, "hooks", "=") ||
      tomlKey(toml.top, "hooks.PostToolUse") ||
      hookTables.some((t) => (t.name === "hooks" && tomlKey(t.body, "PostToolUse")) || (t.name === "hooks.PostToolUse" && !t.array));
    if (inline) {
      const entry = `{ matcher = ${JSON.stringify(g.matcher)}, hooks = [{ type = ${JSON.stringify(h.type)}, command = ${JSON.stringify(h.command)}, timeout = ${h.timeout}, statusMessage = ${JSON.stringify(h.statusMessage)} }] }`;
      return { file: rel, action: "skipped", what, detail: `PostToolUse hooks are defined inline there, so another [[hooks.PostToolUse]] can't be appended; add this to that PostToolUse array by hand:\n${entry}` };
    }
    files.set(rel, appendSection(text, table));
    return { file: rel, action: "update", what };
  }
  return (
    await editJson(files, ".codex/hooks.json", what, (cfg) => {
      upsertHookGroup(objectAt(cfg, "hooks"), "PostToolUse", codexHookGroup(), "post-edit");
    })
  )[0]!;
}

/**
 * Whether Codex hooks are switched off (`[features] hooks = false`, or the deprecated `codex_hooks`),
 * project config first, then ~/.codex. https://learn.chatgpt.com/docs/hooks
 */
export function codexHooksSetting(text: string): boolean | undefined {
  const toml = tomlLayout(text);
  const features = toml.tables.find((t) => t.name === "features" && !t.array)?.body ?? "";
  const m =
    features.match(/^[ \t]*"?(?:codex_)?hooks"?[ \t]*=[ \t]*(true|false)\b/m) ??
    toml.top.match(/^[ \t]*features[ \t]*\.[ \t]*"?(?:codex_)?hooks"?[ \t]*=[ \t]*(true|false)\b/m) ??
    toml.top.match(/^[ \t]*features[ \t]*=[ \t]*\{[^}\n]*\b(?:codex_)?hooks[ \t]*=[ \t]*(true|false)\b/m);
  return m ? m[1] === "true" : undefined;
}

async function notesStep(files: ProjectFiles, opts: SetupOptions, rel: string, notes: string[]): Promise<SetupChange> {
  const what = "notes block";
  if (!opts.renderNotes) return { file: rel, action: "skipped", what, detail: "not requested" };
  let rendered;
  try {
    rendered = await opts.renderNotes(join(opts.cwd, rel));
  } catch (err) {
    return { file: rel, action: "skipped", what, detail: (err as Error).message };
  }
  if ("skip" in rendered) return { file: rel, action: "skipped", what, detail: rendered.skip };
  if (rendered.note) notes.push(rendered.note);
  const text = await files.read(rel);
  const { block } = await readBlock(join(opts.cwd, rel));
  if (sameBlock(block, rendered.block)) return { file: rel, action: "unchanged", what, detail: rendered.detail };
  files.set(rel, applyBlock(text, rendered.block));
  return { file: rel, action: files.existed(rel) ? "update" : "create", what, detail: rendered.detail };
}

// ── merging ─────────────────────────────────────────────────────────────────

type Json = Record<string, any>;

/** True when a command (string, or argv parts) runs `stalemap … <sub>`. */
function runsStalemap(command: unknown, sub: string): boolean {
  const s = (Array.isArray(command) ? command : [command]).filter((x) => typeof x === "string").join(" ");
  return /stalemap/.test(s) && new RegExp(`(^|[\\s"'])${sub}([\\s"']|$)`).test(s);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function objectAt(parent: Json, key: string): Json {
  const v = parent[key];
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  if (v !== undefined) throw new Error(`\`${key}\` isn't an object`);
  return (parent[key] = {});
}

/**
 * Register the MCP server unless one already runs stalemap's: an existing entry keeps the user's
 * version pin, env and timeouts.
 */
function addMcpServer(cfg: Json, key: string, entry: Json, argv: (server: Json) => unknown[]): void {
  const servers = objectAt(cfg, key);
  if (Object.values(servers).some((s) => s && typeof s === "object" && runsStalemap(argv(s), "mcp"))) return;
  servers.stalemap = servers.stalemap && typeof servers.stalemap === "object" ? { ...servers.stalemap, ...entry } : entry;
}

const isOurHook = (h: Json, sub: string) => runsStalemap([h?.command, ...(Array.isArray(h?.args) ? h.args : [])], sub);

/** Claude Code / Codex shape: event → [{ matcher, hooks: [handler] }]. Replaces an older stalemap handler. */
function upsertHookGroup(hooks: Json, event: string, group: Json, sub: string): void {
  const groups: Json[] = Array.isArray(hooks[event]) ? hooks[event] : [];
  if (groups.some((g) => same(g, group))) return;
  const kept = groups
    .map((g) => (Array.isArray(g?.hooks) && g.hooks.some((h: Json) => isOurHook(h, sub)) ? { ...g, hooks: g.hooks.filter((h: Json) => !isOurHook(h, sub)) } : g))
    .filter((g, i) => !(Array.isArray(g?.hooks) && g.hooks.length === 0 && groups[i]!.hooks.length > 0));
  hooks[event] = [...kept, group];
}

/** Cursor shape: event → [{ command, matcher, timeout }]. Replaces an older stalemap entry. */
function upsertFlatHook(hooks: Json, event: string, hook: Json, sub: string): void {
  const list: Json[] = Array.isArray(hooks[event]) ? hooks[event] : [];
  if (list.some((h) => same(h, hook))) return;
  hooks[event] = [...list.filter((h) => !isOurHook(h, sub)), hook];
}

async function editJson(files: ProjectFiles, rel: string, what: string, mutate: (cfg: Json) => void, initial: Json = {}): Promise<SetupChange[]> {
  const text = await files.read(rel);
  const parsed = text?.trim() ? parseJsonc(text) : { value: structuredClone(initial), lossy: false };
  const manual = () => {
    const sample = structuredClone(initial);
    mutate(sample);
    return `add this by hand:\n${formatJson(sample, 2)}`;
  };
  if (!parsed || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return [{ file: rel, action: "skipped", what, detail: `couldn't parse it; ${manual()}` }];
  }
  const cfg = parsed.value as Json;
  const before = JSON.stringify(cfg);
  try {
    mutate(cfg);
  } catch (err) {
    return [{ file: rel, action: "skipped", what, detail: `${(err as Error).message}; ${manual()}` }];
  }
  if (JSON.stringify(cfg) === before) return [{ file: rel, action: "unchanged", what }];
  if (parsed.lossy) return [{ file: rel, action: "skipped", what, detail: `rewriting it would drop its comments; ${manual()}` }];
  files.set(rel, formatJson(cfg, indentOf(text)) + "\n");
  return [{ file: rel, action: files.existed(rel) ? "update" : "create", what }];
}

/** A file stalemap owns outright. Rewritten only if it carries stalemap's header. */
async function writeOwnedFile(files: ProjectFiles, rel: string, what: string, content: string): Promise<SetupChange> {
  const text = await files.read(rel);
  if (text === content) return { file: rel, action: "unchanged", what };
  if (text !== undefined && !text.startsWith(GENERATED_HEADER)) return { file: rel, action: "skipped", what, detail: "the file exists and wasn't written by stalemap" };
  files.set(rel, content);
  return { file: rel, action: text === undefined ? "create" : "update", what };
}

function indentOf(text: string | undefined): string {
  return text?.match(/^([ \t]+)"/m)?.[1] ?? "  ";
}

/** JSON.stringify, but short arrays of strings and numbers stay on one line (`"args": ["-y", "stalemap@latest"]`). */
export function formatJson(value: unknown, indent: string | number = 2, depth = 0): string {
  const pad = typeof indent === "number" ? " ".repeat(indent) : indent;
  const inner = pad.repeat(depth + 1);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    const flat = `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
    if (value.every((v) => v === null || typeof v !== "object") && flat.length <= 80) return flat;
    return `[\n${value.map((v) => inner + formatJson(v, pad, depth + 1)).join(",\n")}\n${pad.repeat(depth)}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (!entries.length) return "{}";
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${formatJson(v, pad, depth + 1)}`).join(",\n")}\n${pad.repeat(depth)}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * A TOML file split at its table headers: `top` is the text before the first header, and each table
 * runs to the next header. Enough to find where a key is defined; not a full parser (a header-like
 * line inside a multi-line string would confuse it).
 */
function tomlLayout(text: string): { top: string; tables: { name: string; array: boolean; body: string }[] } {
  const heads = [...text.matchAll(/^[ \t]*(\[\[?)[ \t]*([^\]\n]+?)[ \t]*\]\]?[ \t]*(?:#.*)?$/gm)];
  return {
    top: text.slice(0, heads[0]?.index ?? text.length),
    tables: heads.map((m, i) => ({
      name: m[2]!.replace(/\s*\.\s*/g, ".").replace(/"/g, ""),
      array: m[1] === "[[",
      body: text.slice(m.index! + m[0].length, heads[i + 1]?.index ?? text.length),
    })),
  };
}

/** Whether `body` defines `key` (dotted, e.g. `mcp_servers.stalemap`): `key = …`, or `key.sub = …` unless `only` is "=". */
function tomlKey(body: string, key: string, only?: "="): boolean {
  const path = key.split(".").map((k) => `"?${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"?`).join("[ \\t]*\\.[ \\t]*");
  return new RegExp(`^[ \\t]*${path}[ \\t]*${only ? "=" : "[.=]"}`, "m").test(body);
}

function appendSection(text: string | undefined, section: string): string {
  if (!text?.trim()) return section + "\n";
  return text + (text.endsWith("\n\n") ? "" : text.endsWith("\n") ? "\n" : "\n\n") + section + "\n";
}

/** Reads each file once and tracks what setup would write, so steps can build on each other. */
class ProjectFiles {
  private original = new Map<string, string | undefined>();
  private current = new Map<string, string | undefined>();
  constructor(private root: string) {}

  async read(rel: string): Promise<string | undefined> {
    if (!this.current.has(rel)) {
      const text = await readFile(join(this.root, rel), "utf8").catch(() => undefined);
      this.original.set(rel, text);
      this.current.set(rel, text);
    }
    return this.current.get(rel);
  }

  set(rel: string, text: string): void {
    this.current.set(rel, text);
  }

  existed(rel: string): boolean {
    return this.original.get(rel) !== undefined;
  }

  changed(): [string, string][] {
    return [...this.current].filter((e): e is [string, string] => e[1] !== undefined && e[1] !== this.original.get(e[0]));
  }
}

const GENERATED_HEADER = "// Generated by `stalemap setup --agent opencode`.";

/**
 * The OpenCode guard. `tool.execute.after` gets the tool's args and may rewrite `output.output`,
 * which is what the model sees (opencode packages/opencode/src/session/tools.ts, v1.19). The
 * model comes from `chat.message`. Edit tools: edit/write take `filePath`; apply_patch (GPT
 * models) takes `patchText` in the `*** Update File:` format.
 */
const OPENCODE_PLUGIN = `${GENERATED_HEADER} Re-run it to update this file; delete the file to remove the guard.
//
// stalemap's edit-time guard: after the agent edits a file, type-check it against the dependency
// versions installed here, and append the APIs it used that changed after the model's training
// cutoff to the tool result. https://github.com/Umair/stalemap#other-agents
// Plugin API: https://opencode.ai/docs/plugins/
import { spawn } from "node:child_process";

const EDIT_TOOLS = new Set(["edit", "write", "multiedit", "patch", "apply_patch"]);
const TIMEOUT_MS = ${GUARD_TIMEOUT_S * 1000};

function runGuard(payload, cwd) {
  return new Promise((resolve) => {
    let out = "";
    let child;
    try {
      child = spawn("npx", [${guardCommand("opencode").slice(1).map((a) => JSON.stringify(a)).join(", ")}], {
        cwd,
        stdio: ["pipe", "pipe", "ignore"],
        shell: process.platform === "win32",
      });
    } catch {
      return resolve("");
    }
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      resolve(out);
    };
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", done);
    child.on("close", done);
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}

export const StalemapGuard = async ({ directory }) => {
  const models = new Map(); // sessionID → model id, for the training cutoff
  return {
    "chat.message": async (input) => {
      if (input.model?.modelID) models.set(input.sessionID, input.model.modelID);
    },
    "tool.execute.after": async (input, output) => {
      if (!EDIT_TOOLS.has(input.tool)) return;
      try {
        const payload = { tool: input.tool, args: input.args, sessionID: input.sessionID, cwd: directory, model: models.get(input.sessionID) };
        const raw = (await runGuard(payload, directory)).trim();
        const context = raw ? JSON.parse(raw).additionalContext : undefined;
        if (context) output.output = \`\${output.output ?? ""}\\n\\n\${context}\`;
      } catch {
        // The guard must never break an edit.
      }
    },
  };
};
`;
