import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Context7Keys, context7Answered, context7Connected, context7Errors, context7TurnedAway, hookRuns, jobList, limitReason, mergeShards, parseShard, runIdOf, shardJobs } from "../bench/scale.ts";

const TASKS = ["t1", "t2", "t3", "t4", "t5"];
const ARMS = ["alone", "context7", "stalemap-guard", "context7-stalemap"];

test("jobList starts checks before one-shot within each repetition, arms interleaved", () => {
  const jobs = jobList(TASKS, ARMS, ["oneshot", "checks"], 2);
  assert.equal(jobs.length, 5 * 4 * 2 * 2);
  assert.equal(new Set(jobs.map((j) => runIdOf("heldout-v3", j))).size, jobs.length);
  const order = jobs.map((j) => `${j.rep}${j.mode}`).filter((x, i, a) => a[i - 1] !== x);
  assert.deepEqual(order, ["1checks", "1oneshot", "2checks", "2oneshot"]);
  assert.deepEqual(jobs.slice(0, 4).map((j) => j.arm), ARMS);
  assert.ok(jobs.slice(0, 4).every((j) => j.task === "t1"));
  assert.deepEqual([...new Set(jobList(TASKS, ARMS, ["oneshot"], 1).map((j) => j.mode))], ["oneshot"]);
});

test("runIdOf matches run.ts's names", () => {
  assert.equal(runIdOf("dev", { task: "ai-tool", arm: "alone", mode: "checks", rep: 2 }), "ai-tool.alone.checks.r2");
  assert.equal(runIdOf("heldout-v2", { task: "x", arm: "context7", mode: "oneshot", rep: 1 }), "heldout-v2.x.context7.oneshot.r1");
});

test("parseShard", () => {
  assert.deepEqual(parseShard("2/4"), { index: 2, count: 4 });
  for (const bad of ["0/2", "3/2", "1", "a/b", "1/0"]) assert.throws(() => parseShard(bad));
});

test("shards split the job list into whole task blocks with every arm", () => {
  const jobs = jobList(TASKS, ARMS, ["oneshot", "checks"], 3);
  for (const n of [1, 2, 3, 4, 7]) {
    const shards = Array.from({ length: n }, (_, i) => shardJobs(jobs, { index: i + 1, count: n }));
    const ids = shards.flat().map((j) => runIdOf("dev", j));
    assert.equal(ids.length, jobs.length);
    assert.equal(new Set(ids).size, jobs.length);
    for (const s of shards) {
      // The order within a shard is the run's order.
      assert.deepEqual(s, jobs.filter((j) => s.includes(j)));
      // Every arm equally often, and each task × mode × rep block whole.
      for (const a of ARMS) assert.equal(s.filter((j) => j.arm === a).length, s.length / ARMS.length);
      const blocks = new Set(s.map((j) => `${j.rep}${j.mode}${j.task}`));
      assert.equal(blocks.size * ARMS.length, s.length);
    }
    // Deterministic.
    assert.deepEqual(shardJobs(jobs, { index: 1, count: n }), shards[0]);
  }
  // Two shards of 5 tasks × 2 modes × 3 reps (30 blocks) get 15 blocks each.
  assert.equal(shardJobs(jobs, { index: 2, count: 2 }).length, 15 * 4);
});

const assistant = (content: unknown[], extra: object = {}) => ({ type: "assistant", message: { content }, ...extra });
const user = (content: unknown[]) => ({ type: "user", message: { content } });

test("limitReason: a plan or API limit anywhere in the session", () => {
  const work = [assistant([{ type: "tool_use", id: "a", name: "Write", input: {} }]), user([{ type: "tool_result", tool_use_id: "a", content: "ok" }])];
  const ok = { is_error: false, result: "done" };
  assert.equal(limitReason([{ type: "rate_limit_event", rate_limit_info: { status: "allowed_warning" } }, ...work], ok), undefined);
  assert.match(limitReason([...work, { type: "rate_limit_event", rate_limit_info: { status: "rejected" } }], ok)!, /rejected/);
  assert.match(limitReason([...work, { type: "system", subtype: "api_retry", error_status: 529, error: "server_error" }, ...work], ok)!, /529/);
  assert.match(limitReason([{ type: "system", subtype: "api_retry", error_status: 429, error: "rate_limit" }], ok)!, /429/);
  assert.match(limitReason([...work, assistant([{ type: "text", text: "API Error: Overloaded" }], { is_api_error_message: true, api_error_status: 529 })], { is_error: true, result: "API Error" })!, /529/);
  assert.match(limitReason(work, { is_error: true, result: "Claude AI usage limit reached|1792407600" })!, /usage limit/);
  assert.match(limitReason(work, undefined, "Error: 529 overloaded_error")!, /overloaded/);
  // Not a limit: other retried errors, and the agent's own words or files.
  assert.equal(limitReason([{ type: "system", subtype: "api_retry", error_status: 500, error: "server_error" }], ok), undefined);
  const talk = [assistant([{ type: "text", text: "Return 429 Too Many Requests when the rate limit is reached; try again later." }]), user([{ type: "tool_result", tool_use_id: "a", content: "status 429, overloaded" }])];
  assert.equal(limitReason(talk, ok), undefined);
  assert.equal(limitReason(talk, undefined, ""), undefined);
  assert.equal(limitReason(talk, { is_error: false, result: "Handled 429 rate limits; try again works" }), undefined);
});

test("hookRuns times PostToolUse hooks from their events' arrival", () => {
  const ev = (subtype: string, id: string, outcome?: string) => ({ type: "system", subtype, hook_id: id, hook_event: "PostToolUse", ...(outcome ? { outcome } : {}) });
  const events = [ev("hook_started", "a"), ev("hook_response", "a", "success"), { type: "system", subtype: "hook_started", hook_id: "s", hook_event: "SessionStart" }, ev("hook_started", "b"), ev("hook_response", "b", "cancelled"), ev("hook_started", "c")];
  assert.deepEqual(hookRuns(events, [1000, 3500, 4000, 5000, 65000, 70000]), [
    { ms: 2500, outcome: "success" },
    { ms: 60000, outcome: "cancelled" },
    { ms: null, outcome: "no response" },
  ]);
  assert.deepEqual(hookRuns([], []), []);
});

test("context7Errors counts Context7 calls that failed or were rate limited", () => {
  const events = [
    assistant([
      { type: "tool_use", id: "1", name: "mcp__context7__resolve-library-id" },
      { type: "tool_use", id: "2", name: "mcp__context7__query-docs" },
      { type: "tool_use", id: "3", name: "mcp__context7__query-docs" },
      { type: "tool_use", id: "4", name: "Read" },
    ]),
    user([
      { type: "tool_result", tool_use_id: "1", content: [{ type: "text", text: "Library: /vercel/ai" }] },
      { type: "tool_result", tool_use_id: "2", is_error: true, content: "fetch failed" },
      { type: "tool_result", tool_use_id: "3", content: [{ type: "text", text: "Rate limited or quota exceeded. Create a free API key" }] },
      { type: "tool_result", tool_use_id: "4", is_error: true, content: "Rate limited" },
    ]),
  ];
  assert.equal(context7Errors(events), 2);
  assert.equal(context7Connected([{ type: "system", subtype: "init", mcp_servers: [{ name: "context7", status: "connected" }] }]), true);
  assert.equal(context7Connected([{ type: "system", subtype: "init", mcp_servers: [{ name: "context7", status: "failed" }] }]), false);
  assert.equal(context7Connected([{ type: "system", subtype: "init", mcp_servers: [] }]), undefined);
});

test("context7TurnedAway flags quota, rate limit and key answers, not a failed fetch", () => {
  const session = (...results: object[]) => [
    assistant(results.map((_, i) => ({ type: "tool_use", id: String(i), name: "mcp__context7__query-docs" }))),
    user(results.map((r, i) => ({ type: "tool_result", tool_use_id: String(i), ...r }))),
  ];
  assert.equal(context7TurnedAway(session({ content: [{ type: "text", text: "Library ID: /vercel/next.js" }] })), false);
  assert.equal(context7TurnedAway(session({ is_error: true, content: "fetch failed" })), false, "a network error is the real tool misbehaving, not a key");
  assert.equal(context7TurnedAway(session({ content: "docs" }, { content: [{ type: "text", text: "Rate limited or quota exceeded. Upgrade your plan" }] })), true);
  assert.equal(context7TurnedAway(session({ content: "Invalid API key. Please check your API key." })), true);
});

test("Context7Keys gives each session the key with the most calls left, and runs dry cleanly", () => {
  const keys = new Context7Keys([30, 25, 0], 10);
  assert.equal(keys.acquire(), 0, "most calls left");
  assert.equal(keys.acquire(), 1, "key 0 has 20 free after its reservation, key 1 has 25");
  assert.equal(keys.acquire(), 0);
  assert.equal(keys.acquire(), 1);
  assert.equal(keys.acquire(), 0);
  assert.equal(keys.acquire(), undefined, "every key's free calls are reserved; key 2 never had room");
  assert.equal(keys.busy, true);
  // Two sessions on key 0 finish after 3 and 2 calls: 25 left, 10 still reserved, so it has room again.
  keys.release(0, 3);
  assert.equal(keys.acquire(), undefined, "7 free calls are less than one session's reservation");
  keys.release(0, 2);
  assert.equal(keys.acquire(), 0, "finished sessions hand back the calls they didn't use");
  // Key 1 turned a call away, and the usage endpoint says it's empty.
  keys.release(1, 2);
  keys.setRemaining(1, 0);
  keys.release(1, 0);
  keys.release(0, 4);
  keys.release(0, 1);
  assert.equal(keys.busy, false);
  assert.equal(keys.left, 20);
  assert.equal(keys.acquire(), 0);
  keys.release(0, 11);
  assert.equal(keys.acquire(), undefined, "9 calls left is less than one session's reservation");
  assert.equal(new Context7Keys([Number.POSITIVE_INFINITY]).acquire(), 0, "a paid key never runs dry");
});

test("context7Answered tells a docs answer from quota, key and connection failures", () => {
  const call = (result: object) => [
    { type: "system", subtype: "init", mcp_servers: [{ name: "context7", status: "connected" }] },
    assistant([{ type: "tool_use", id: "1", name: "mcp__context7__resolve-library-id" }]),
    user([{ type: "tool_result", tool_use_id: "1", ...result }]),
  ];
  const ok = context7Answered(call({ content: [{ type: "text", text: "- Title: React\n- Context7-compatible library ID: /websites/react_dev" }] }));
  assert.deepEqual(ok, { ok: true, detail: "Context7 answered with /websites/react_dev" });
  // v2's answer: not flagged as an error, and the dashboard URL in it isn't a library ID.
  const quota = context7Answered(call({ content: [{ type: "text", text: "Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests." }] }));
  assert.equal(quota.ok, false);
  assert.match(quota.detail, /^Context7 answered: Monthly quota exceeded/);
  assert.equal(context7Answered(call({ content: "Invalid API key. Please check your API key." })).ok, false);
  assert.equal(context7Answered(call({ is_error: true, content: "fetch failed" })).ok, false);
  assert.deepEqual(context7Answered([{ type: "system", subtype: "init", mcp_servers: [{ name: "context7", status: "failed" }] }]), { ok: false, detail: "the Context7 server didn't connect" });
  assert.deepEqual(context7Answered([]), { ok: false, detail: "no Context7 call was made" });
});

async function shardDirs(edit: (shards: { build: Record<string, unknown>; rows: { runId: string }[]; notes: string }[]) => void = () => {}) {
  const root = await mkdtemp(join(tmpdir(), "stalemap-shards-"));
  const config = { suite: "heldout-v3", model: "m", tasks: ["t1", "t2", "t3"], arms: ["alone", "context7"], modes: ["oneshot", "checks"], reps: 1, examples: true };
  const jobs = jobList(config.tasks, config.arms, config.modes, config.reps);
  const shards = [1, 2].map((i) => ({
    build: { ...config, commit: "abc", dirty: false, distSha256: "d1", claudeVersion: "2.1.280", templates: { latest: "t" }, shard: `${i}/2` },
    rows: shardJobs(jobs, { index: i, count: 2 }).map((j) => ({ runId: runIdOf("heldout-v3", j), pass: true })),
    notes: "notes\n",
  }));
  edit(shards);
  const dirs: string[] = [];
  for (const [i, s] of shards.entries()) {
    const dir = join(root, `shard-${i + 1}`);
    await mkdir(join(dir, "runs"), { recursive: true });
    await writeFile(join(dir, "build.jsonl"), JSON.stringify(s.build) + "\n");
    await writeFile(join(dir, "results.jsonl"), s.rows.map((r) => JSON.stringify(r) + "\n").join(""));
    await writeFile(join(dir, "stalemap-notes.md"), s.notes);
    await writeFile(join(dir, "runs", `${s.rows[0].runId}.jsonl`), "{}\n");
    dirs.push(dir);
  }
  return { root, dirs, out: join(root, "merged") };
}

test("mergeShards joins the shards of one run", async () => {
  const { dirs, out } = await shardDirs();
  const rows = await mergeShards(out, dirs);
  assert.equal(rows.length, 3 * 2 * 2);
  assert.equal((await readFile(join(out, "results.jsonl"), "utf8")).trim().split("\n").length, 12);
  assert.equal((await readFile(join(out, "build.jsonl"), "utf8")).trim().split("\n").length, 2);
  assert.equal(await readFile(join(out, "stalemap-notes.md"), "utf8"), "notes\n");
  await assert.rejects(mergeShards(out, dirs), /already has results/);
});

test("mergeShards refuses shards that aren't one run", async () => {
  const cases: [RegExp, (s: { build: Record<string, unknown>; rows: { runId: string }[]; notes: string }[]) => void][] = [
    [/dist hash/, (s) => (s[1].build.distSha256 = "d2")],
    [/commit/, (s) => (s[1].build.commit = "def")],
    [/Claude Code version/, (s) => (s[1].build.claudeVersion = "2.1.281")],
    [/template installs/, (s) => (s[1].build.templates = { latest: "u" })],
    [/run settings/, (s) => (s[1].build.reps = 2)],
    [/shards 1\.\.2/, (s) => (s[1].build.shard = "1/2")],
    [/missing 1 sessions/, (s) => s[1].rows.pop()],
    [/doesn't belong/, (s) => s[0].rows.push(s[1].rows[0])],
    [/differs/, (s) => (s[1].notes = "other notes\n")],
  ];
  for (const [error, edit] of cases) {
    const { dirs, out } = await shardDirs(edit);
    await assert.rejects(mergeShards(out, dirs), error);
  }
});

test("the stalemap-full arm's MCP config runs the build under test for one workspace and model", async () => {
  const { stalemapMcpConfig } = await import("../bench/scale.ts");
  const cfg = stalemapMcpConfig("/repo/dist/cli.js", "/work/runs/r1", "claude-sonnet-4-5", "/tmp/cache");
  assert.deepEqual(cfg.mcpServers.stalemap.args, ["/repo/dist/cli.js", "mcp", "--cwd", "/work/runs/r1", "--model", "claude-sonnet-4-5"]);
  assert.equal(cfg.mcpServers.stalemap.command, process.execPath);
  assert.deepEqual(cfg.mcpServers.stalemap.env, { STALEMAP_MODEL: "claude-sonnet-4-5", STALEMAP_CACHE: "/tmp/cache" });
  // The prompt rule for the arm is as direct as the Context7 arm's.
  const rule = await readFile(join(import.meta.dirname, "..", "bench", "arms", "stalemap.md"), "utf8");
  assert.match(rule, /^- Always use stalemap's `search_changes` tool when I need code generation, setup or configuration steps, or library\/API documentation/);
});
