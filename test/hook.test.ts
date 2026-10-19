import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { cursorContextWorks, findingKey, freshNotes, guardHookOutput, parseEditEvent, patchFiles, readCursorLedger, unreportedFindings, cursorStopLoopLimit, untilDeadline } from "../src/hook.ts";
import type { GuardResult } from "../src/guard.ts";
import { CURSOR_STOP_LOOP_LIMIT, setupAgent } from "../src/setup.ts";

const root = join(import.meta.dirname, "..");

async function project(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "stalemap-hook-"));
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(dir, name, ".."), { recursive: true });
    await writeFile(join(dir, name), text);
  }
  return dir;
}

// Sample payloads, shaped like each agent's docs.
const CLAUDE = {
  session_id: "abc",
  cwd: "/repo",
  hook_event_name: "PostToolUse",
  tool_name: "Write",
  tool_input: { file_path: "/repo/src/a.ts", content: "…" },
  tool_response: { success: true },
};
const PATCH = `*** Begin Patch
*** Add File: src/new.ts
+export const x = 1;
*** Update File: src/old.ts
@@
-a
+b
*** Update File: src/moved.ts
*** Move to: src/renamed.ts
*** Delete File: src/gone.ts
*** End Patch`;
const CODEX = {
  session_id: "s1",
  turn_id: "t1",
  cwd: "/repo",
  hook_event_name: "PostToolUse",
  model: "gpt-5.5",
  tool_name: "apply_patch",
  tool_use_id: "call_1",
  tool_input: { command: PATCH },
  tool_response: "Success. Updated the following files: …",
};
const CURSOR_POST_TOOL_USE = {
  conversation_id: "c1",
  generation_id: "g1",
  model: "claude-4.5-sonnet",
  model_id: "claude-sonnet-4-5",
  hook_event_name: "postToolUse",
  cursor_version: "3.8.0",
  workspace_roots: ["/repo"],
  tool_name: "Write",
  tool_input: { file_path: "/repo/src/a.ts" },
  tool_output: "{}",
  tool_use_id: "t1",
  cwd: "/repo",
  duration: 12,
};
const CURSOR_AFTER_FILE_EDIT = {
  conversation_id: "c1",
  hook_event_name: "afterFileEdit",
  workspace_roots: ["/repo"],
  file_path: "/repo/src/b.ts",
  edits: [{ old_string: "a", new_string: "b" }],
};

test("parseEditEvent reads each agent's post-edit payload", () => {
  assert.deepEqual(parseEditEvent("claude", CLAUDE), { files: ["/repo/src/a.ts"], cwd: "/repo", models: [], sessionId: "abc" });
  assert.deepEqual(parseEditEvent("codex", CODEX), {
    files: ["src/new.ts", "src/old.ts", "src/moved.ts", "src/renamed.ts"],
    cwd: "/repo",
    models: ["gpt-5.5"],
    sessionId: "s1",
  });
  assert.deepEqual(parseEditEvent("codex", { ...CODEX, tool_name: "Bash", tool_input: { command: "ls" } }).files, []);
  assert.deepEqual(parseEditEvent("cursor", CURSOR_POST_TOOL_USE), {
    files: ["/repo/src/a.ts"],
    cwd: "/repo",
    models: ["claude-sonnet-4-5", "claude-4.5-sonnet"],
    sessionId: "c1",
  });
  assert.deepEqual(parseEditEvent("cursor", { ...CURSOR_POST_TOOL_USE, tool_input: { path: "src/c.ts" } }).files, ["src/c.ts"]);
  const afterEdit = parseEditEvent("cursor", CURSOR_AFTER_FILE_EDIT);
  assert.deepEqual([afterEdit.files, afterEdit.cwd], [["/repo/src/b.ts"], "/repo"]);
  assert.deepEqual(parseEditEvent("opencode", { tool: "edit", args: { filePath: "/repo/src/a.ts", oldString: "a", newString: "b" }, cwd: "/repo", model: "claude-sonnet-4-5", sessionID: "ses_1" }), {
    files: ["/repo/src/a.ts"],
    cwd: "/repo",
    models: ["claude-sonnet-4-5"],
    sessionId: "ses_1",
  });
  assert.deepEqual(parseEditEvent("opencode", { tool: "apply_patch", args: { patchText: PATCH } }).files.length, 4);
  for (const agent of ["claude", "codex", "cursor", "opencode"] as const) assert.deepEqual(parseEditEvent(agent, {}).files, [], agent);
});

test("patchFiles skips deleted files and repeats", () => {
  assert.deepEqual(patchFiles(PATCH), ["src/new.ts", "src/old.ts", "src/moved.ts", "src/renamed.ts"]);
  assert.deepEqual(patchFiles("*** Update File: a.ts\n*** Update File: a.ts\n"), ["a.ts"]);
  assert.deepEqual(patchFiles(undefined), []);
});

test("guardHookOutput answers in each agent's format", () => {
  assert.deepEqual(JSON.parse(guardHookOutput("claude", "msg")), { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "msg" } });
  assert.deepEqual(JSON.parse(guardHookOutput("codex", "msg")), { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "msg" } });
  assert.deepEqual(JSON.parse(guardHookOutput("cursor", "msg")), { additional_context: "msg" });
  assert.deepEqual(JSON.parse(guardHookOutput("opencode", "msg")), { additionalContext: "msg" });
});

function runHook(agent: string, payload: unknown, env: Record<string, string>, sub = "post-edit"): Promise<{ code: number; stdout: string }> {
  return new Promise((done) => {
    const child = execFile(
      process.execPath,
      ["--import", "tsx", join(root, "src/cli.ts"), "hook", sub, "--agent", agent],
      { cwd: root, env: { ...process.env, ...env }, timeout: 60_000 },
      (err, stdout) => done({ code: err ? ((err as { code?: number }).code ?? 1) : 0, stdout }),
    );
    child.stdin!.end(JSON.stringify(payload));
  });
}

const LIB = `export interface CallOptions { model: string; stopWhen?: number }
export declare function generate(options: CallOptions): Promise<string>;
`;

test("stalemap hook post-edit --agent <name> reports dependency API errors in each agent's format", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { lib: "2.0.0" } }),
    "node_modules/lib/package.json": JSON.stringify({ name: "lib", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/lib/index.d.ts": LIB,
    "src/app.ts": `import { generate } from "lib";\nexport const r = generate({ model: "m", maxSteps: 5 });\n`,
    "src/plain.ts": `export const x = 1;\n`,
  });
  // A model the catalog doesn't know keeps this offline: the guard then watches every imported
  // dependency instead of looking up which ones changed. The empty cached catalog avoids models.dev.
  const cache = await mkdtemp(join(tmpdir(), "stalemap-cache-"));
  await writeFile(join(cache, "models.json"), JSON.stringify({ fetchedAt: Date.now(), models: [] }));
  const env = { STALEMAP_MODEL: "not-a-model", STALEMAP_CACHE: cache };

  const codex = await runHook("codex", { ...CODEX, cwd: dir, tool_input: { command: "*** Begin Patch\n*** Update File: src/app.ts\n*** End Patch" } }, env);
  assert.equal(codex.code, 0);
  const context = JSON.parse(codex.stdout).hookSpecificOutput.additionalContext;
  assert.match(context, /^stalemap: `src\/app\.ts` uses APIs that changed/);
  assert.match(context, /maxSteps/);
  // Claude Code's payload (`--agent claude`, the default): the same message, in the same PostToolUse shape.
  const claude = await runHook("claude", { ...CLAUDE, cwd: dir, tool_input: { file_path: join(dir, "src/app.ts") } }, env);
  assert.equal(claude.stdout, codex.stdout);

  const cursor = await runHook("cursor", { ...CURSOR_POST_TOOL_USE, cwd: dir, tool_input: { file_path: join(dir, "src/app.ts") } }, env);
  assert.match(JSON.parse(cursor.stdout).additional_context, /maxSteps/);

  const opencode = await runHook("opencode", { tool: "write", args: { filePath: join(dir, "src/app.ts") }, cwd: dir }, env);
  assert.match(JSON.parse(opencode.stdout).additionalContext, /maxSteps/);

  // Clean files, other tools and garbage input: silent, and never a failed tool call.
  assert.deepEqual(await runHook("codex", { ...CODEX, cwd: dir, tool_input: { command: "*** Update File: src/plain.ts" } }, env), { code: 0, stdout: "" });
  assert.deepEqual(await runHook("codex", { ...CODEX, cwd: dir, tool_name: "Bash", tool_input: { command: "ls" } }, env), { code: 0, stdout: "" });
  assert.deepEqual(await runHook("cursor", "not an object", env), { code: 0, stdout: "" });
});

test("the Cursor edit log tracks pending files and what the agent was told", () => {
  const log = [{ edited: "/r/a.ts" }, { edited: "/r/b.ts" }, { shown: ["k1"] }, "not json", { checked: ["/r/a.ts"], reported: ["k2"] }, { edited: "/r/c.ts" }, { edited: "/r/b.ts" }];
  const ledger = readCursorLedger(log.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join("\n"));
  assert.deepEqual(ledger.pending, ["/r/c.ts", "/r/b.ts"], "checked files drop out; a re-edit moves a file to the end");
  assert.deepEqual([[...ledger.reported], [...ledger.shown]], [["k2"], ["k1"]]);

  const finding = (problem: string, line = 1) => ({ line, pkg: "lib", problem });
  assert.equal(findingKey("/r/a.ts", finding("p", 3)), findingKey("/r/a.ts", finding("p", 9)), "line numbers move as the agent edits");
  const result = { file: "/r/a.ts", packages: [], findings: [finding("p1"), finding("p2"), finding("p3")] };
  const told = { pending: [], reported: new Set([findingKey("/r/a.ts", finding("p2"))]), shown: new Set([findingKey("/r/a.ts", finding("p3"))]) };
  assert.deepEqual(unreportedFindings(result, told, false).map((f) => f.problem), ["p1", "p3"], "additional_context doesn't reach the model");
  assert.deepEqual(unreportedFindings(result, told, true).map((f) => f.problem), ["p1"], "once it does, postToolUse's findings aren't repeated");

  assert.equal(cursorContextWorks("3.7.36"), false, "no Cursor version passes additional_context to the model yet");
  assert.equal(cursorContextWorks("3.9.0", "3.9.0"), true);
  assert.equal(cursorContextWorks("3.10.2", "3.9.0"), true);
  assert.equal(cursorContextWorks("3.8.9", "3.9.0"), false);
  assert.equal(cursorContextWorks(undefined, "3.9.0"), false);
});

test("the Cursor stop hook sends the guard's findings as a follow-up message, each one once", async () => {
  const app = (call: string) => `import { generate } from "lib";\nexport const r = ${call};\n`;
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { lib: "2.0.0" } }),
    "node_modules/lib/package.json": JSON.stringify({ name: "lib", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/lib/index.d.ts": LIB,
    "src/app.ts": app(`generate({ model: "m", maxSteps: 5 })`),
    "src/b.ts": app(`generate({ model: "m", maxSteps: 5 })`),
  });
  const cache = await mkdtemp(join(tmpdir(), "stalemap-cache-"));
  await writeFile(join(cache, "models.json"), JSON.stringify({ fetchedAt: Date.now(), models: [] }));
  const env = { STALEMAP_MODEL: "not-a-model", STALEMAP_CACHE: cache };
  const conversation = { conversation_id: "conv-1", generation_id: "g1", model: "auto", cursor_version: "3.7.36", workspace_roots: [dir] };
  const recordEdit = (file: string) => runHook("cursor", { ...CURSOR_AFTER_FILE_EDIT, ...conversation, file_path: join(dir, file) }, env, "record-edit");
  const stop = (status = "completed") => runHook("cursor", { ...conversation, hook_event_name: "stop", status, loop_count: 0 }, env, "stop");

  // afterFileEdit logs the edit; it has no output.
  assert.deepEqual(await recordEdit("src/app.ts"), { code: 0, stdout: "" });
  // postToolUse guards right away (Cursor doesn't pass that to the model yet) and logs the edit too.
  const post = await runHook("cursor", { ...CURSOR_POST_TOOL_USE, ...conversation, cwd: dir, tool_input: { file_path: join(dir, "src/b.ts") } }, env);
  assert.match(JSON.parse(post.stdout).additional_context, /maxSteps/);

  // An aborted turn isn't continued, and its edits wait for the next stop.
  assert.deepEqual(await stop("aborted"), { code: 0, stdout: "" });
  const followup = JSON.parse((await stop()).stdout).followup_message;
  assert.match(followup, /^\[Automated message from stalemap's Cursor stop hook, not from the user\.\]/);
  assert.match(followup, /`src\/b\.ts` uses APIs that changed[\s\S]*`src\/app\.ts` uses APIs that changed/, "most recent edit first");
  assert.match(followup, /maxSteps/);

  // Already reported: an edit that leaves the finding in place doesn't bring it back.
  await recordEdit("src/app.ts");
  assert.deepEqual(await stop(), { code: 0, stdout: "" });

  // A new problem is reported, without the old one.
  await writeFile(join(dir, "src/app.ts"), app(`[generate({ model: "m", maxSteps: 5 }), generate({ model: "m", maxRetries: 1 })]`));
  await recordEdit("src/app.ts");
  const second = JSON.parse((await stop()).stdout).followup_message;
  assert.match(second, /maxRetries/);
  assert.doesNotMatch(second, /maxSteps/);
});

test("the OpenCode plugin pipes edits through the guard and appends its message to the tool output", async () => {
  const dir = await project({ "package.json": JSON.stringify({ type: "module" }) });
  await setupAgent({ agent: "opencode", cwd: dir });
  // A stand-in for npx that records what the plugin sent and answers like the guard.
  const bin = join(dir, "bin");
  await mkdir(bin);
  await writeFile(
    join(bin, "npx"),
    `#!/bin/sh\necho "$@" > "${join(dir, "argv.txt")}"\ncat > "${join(dir, "payload.json")}"\necho '{"additionalContext":"stalemap: use stopWhen"}'\n`,
  );
  await chmod(join(bin, "npx"), 0o755);
  const oldPath = process.env.PATH;
  process.env.PATH = `${bin}:${oldPath}`;
  try {
    const mod = await import(pathToFileURL(join(dir, ".opencode/plugins/stalemap.js")).href);
    const hooks = await mod.StalemapGuard({ directory: dir });
    await hooks["chat.message"]({ sessionID: "ses_1", model: { providerID: "anthropic", modelID: "claude-sonnet-4-5" } }, {});

    const read = { title: "", output: "file contents", metadata: {} };
    await hooks["tool.execute.after"]({ tool: "read", sessionID: "ses_1", callID: "c0", args: { filePath: "a.ts" } }, read);
    assert.equal(read.output, "file contents", "only edit tools run the guard");

    const output = { title: "", output: "Edit applied successfully.", metadata: {} };
    await hooks["tool.execute.after"]({ tool: "edit", sessionID: "ses_1", callID: "c1", args: { filePath: "src/a.ts" } }, output);
    assert.equal(output.output, "Edit applied successfully.\n\nstalemap: use stopWhen");
    assert.equal((await readFile(join(dir, "argv.txt"), "utf8")).trim(), "-y stalemap@latest hook post-edit --agent opencode");
    const payload = JSON.parse(await readFile(join(dir, "payload.json"), "utf8"));
    assert.deepEqual(payload, { tool: "edit", args: { filePath: "src/a.ts" }, sessionID: "ses_1", cwd: dir, model: "claude-sonnet-4-5" });
    assert.deepEqual(parseEditEvent("opencode", payload).files, ["src/a.ts"]);

    // A failing guard leaves the tool output alone.
    await writeFile(join(bin, "npx"), "#!/bin/sh\necho 'npm ERR! oops'\nexit 1\n");
    const failed = { title: "", output: "Wrote file.", metadata: {} };
    await hooks["tool.execute.after"]({ tool: "write", sessionID: "ses_1", callID: "c2", args: { filePath: "src/b.ts" } }, failed);
    assert.equal(failed.output, "Wrote file.");
  } finally {
    process.env.PATH = oldPath;
  }
});

test("untilDeadline keeps what finished before the deadline", async () => {
  const never = new Promise<string>(() => {});
  const steps: Record<string, () => Promise<string>> = { a: async () => "A", b: async () => "B", slow: () => never };
  // The deadline timer is unref'd (it mustn't hold a hook open); in the hook, guardFile's I/O keeps the process alive.
  const alive = setInterval(() => {}, 1000);
  try {
    assert.deepEqual(await untilDeadline(["a", "b", "slow", "a"], 50, (k) => steps[k]!()), ["A", "B"]);
  } finally {
    clearInterval(alive);
  }
  assert.deepEqual(await untilDeadline(["a", "b"], 5_000, (k) => steps[k]!()), ["A", "B"]);
  const boom = async (k: string) => (k === "x" ? Promise.reject(new Error("guard failed")) : k);
  assert.deepEqual(await untilDeadline(["a", "x", "b"], 5_000, boom), ["a"], "a failing file keeps the earlier results");
});

test("the Cursor stop hook's loop limit comes from its hooks.json entry", async () => {
  const home = await project({});
  const dir = await project({});
  assert.equal(await cursorStopLoopLimit(dir, home), CURSOR_STOP_LOOP_LIMIT, "unknown: what setup writes");
  await setupAgent({ agent: "cursor", cwd: dir });
  assert.equal(await cursorStopLoopLimit(dir, home), CURSOR_STOP_LOOP_LIMIT);
  const hooks = JSON.parse(await readFile(join(dir, ".cursor/hooks.json"), "utf8"));
  const stop = hooks.hooks.stop.find((h: { command: string }) => h.command.includes("hook stop"));
  delete stop.loop_limit;
  await writeFile(join(dir, ".cursor/hooks.json"), JSON.stringify(hooks));
  assert.equal(await cursorStopLoopLimit(dir, home), 5, "Cursor's default");
  stop.loop_limit = null;
  await writeFile(join(dir, ".cursor/hooks.json"), JSON.stringify(hooks));
  assert.equal(await cursorStopLoopLimit(dir, home), Infinity, "null: no cap");
});

test("past loop_limit the Cursor stop hook sends nothing and keeps the findings for the next stop", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ name: "app", dependencies: { lib: "2.0.0" } }),
    "node_modules/lib/package.json": JSON.stringify({ name: "lib", version: "2.0.0", types: "index.d.ts" }),
    "node_modules/lib/index.d.ts": LIB,
    "src/app.ts": `import { generate } from "lib";\nexport const r = generate({ model: "m", maxSteps: 5 });\n`,
  });
  await setupAgent({ agent: "cursor", cwd: dir }); // loop_limit 2 in .cursor/hooks.json
  const cache = await mkdtemp(join(tmpdir(), "stalemap-cache-"));
  await writeFile(join(cache, "models.json"), JSON.stringify({ fetchedAt: Date.now(), models: [] }));
  const env = { STALEMAP_MODEL: "not-a-model", STALEMAP_CACHE: cache };
  const conversation = { conversation_id: "conv-loop", generation_id: "g1", model: "auto", cursor_version: "3.7.36", workspace_roots: [dir] };
  await runHook("cursor", { ...CURSOR_AFTER_FILE_EDIT, ...conversation, file_path: join(dir, "src/app.ts") }, env, "record-edit");
  const stop = (loop_count: number) => runHook("cursor", { ...conversation, hook_event_name: "stop", status: "completed", loop_count }, env, "stop");

  assert.deepEqual(await stop(2), { code: 0, stdout: "" }, "Cursor wouldn't submit a follow-up now");
  assert.match(JSON.parse((await stop(1)).stdout).followup_message, /maxSteps/, "not marked as reported");
});

test("edit-time notes show once per session, a few at a time, and never what the notes block says", async () => {
  const cache = await mkdtemp(join(tmpdir(), "stalemap-cache-"));
  const dir = await mkdtemp(join(tmpdir(), "stalemap-hook-"));
  const saved = { cache: process.env.STALEMAP_CACHE, notes: process.env.STALEMAP_NOTES_FILE };
  process.env.STALEMAP_CACHE = cache;
  delete process.env.STALEMAP_NOTES_FILE;
  try {
    const note = (key: string, text: string) => ({ pkg: "next", key, text: `${text} (changelog, 16.0.0)`, matched: ["images"], rank: 10 });
    const result: GuardResult = {
      file: join(dir, "next.config.ts"),
      findings: [],
      packages: [{ name: "next", from: "15.4.0", to: "16.4.2" }],
      notes: [note("a", "Bump default `images.minimumCacheTTL` to 4 hours"), note("b", "Only allow quality 75 by default"), note("c", "Enable X by default"), note("d", "Enable Y by default"), note("e", "Enable Z by default")],
    };
    await writeFile(join(dir, "CLAUDE.md"), "<!-- stalemap:start -->\n- Only allow quality 75 by default. [changelog]\n<!-- stalemap:end -->\n");
    const first = await freshNotes(result, dir, "session-1");
    assert.deepEqual(first!.notes!.map((n) => n.key), ["a", "c", "d"], "the block's note is skipped, three at most");
    const second = await freshNotes(result, dir, "session-1");
    assert.deepEqual(second!.notes!.map((n) => n.key), ["e"], "the same session doesn't see a note twice");
    const other = await freshNotes(result, dir, "session-2");
    assert.deepEqual(other!.notes!.map((n) => n.key), ["a", "c", "d"], "another session starts fresh");
  } finally {
    if (saved.cache === undefined) delete process.env.STALEMAP_CACHE;
    else process.env.STALEMAP_CACHE = saved.cache;
    if (saved.notes !== undefined) process.env.STALEMAP_NOTES_FILE = saved.notes;
  }
});
