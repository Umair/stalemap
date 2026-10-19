# stalemap benchmark

Does a coding agent write code that works against library versions released after its training cutoff, and do stalemap's notes help? This compares, on the same tasks:

| arm | what the agent gets |
|---|---|
| `alone` | the project and the shared rules |
| `context7` | plus the [Context7](https://github.com/upstash/context7) docs MCP server and Context7's recommended "always use Context7" rule |
| `stalemap` | plus the block `stalemap scan --all` generates for the model (`--examples` adds verified Before → After lines) |
| `stalemap-guard` | plus stalemap's post-edit guard hook, installed with `--settings`. Since the post-hoc v2 changes its notes come from `scan --guard`, ranked for an agent that runs the guard (the pre-registered runs used the plain ranking) |
| `context7-stalemap` | Context7, the notes and the guard together |
| `oracle` | exploratory: a one-line hint naming the task's target change (heldout-v3: each task's meta.json; earlier suites: [arms/oracle/](arms/oracle/)), no stalemap block and no guard. A ceiling for what a note can do |
| `tsc-hook` | exploratory: a plain `tsc --noEmit` PostToolUse hook ([arms/tsc-hook.mjs](arms/tsc-hook.mjs)), no notes |
| `stalemap-full` | exploratory, after the v3 run: the notes and the guard as in `stalemap-guard`, plus stalemap's own MCP server (`stalemap mcp`, with `search_changes`) through `--mcp-config` and a rule as direct as the Context7 arm's ([arms/stalemap.md](arms/stalemap.md)). The search index for each task's starting workspace is built once with the notes, before any session |

Results for the arms that use a third-party tool (`context7`, `context7-stalemap`) are withheld from the results files pending permission. The arms stay in the harness so the runs can be reproduced.

Each arm runs in two modes:

- `oneshot`: file tools only (Read, Write, Edit, Glob, Grep). The agent can't run anything, like an app builder's first generation or a quick edit with no test loop.
- `checks`: plus Bash limited to `npm test` (`tsc --noEmit` and smoke tests) and `npx tsc`. The agent can find and fix its own type errors.

## Tasks

The project pins `ai@7.0.142`, `zod@4.6.7` and `next@16.4.2`. Every task touches an API that changed after `claude-sonnet-4-5`'s cutoff (2025-07-31).

| task | what changed |
|---|---|
| `ai-multistep` | `maxSteps` → `stopWhen: stepCountIs(n)`; tool `parameters` → `inputSchema` |
| `ai-tool` | tool `parameters` → `inputSchema` |
| `ai-messages` | `convertToCoreMessages`/`CoreMessage` → `convertToModelMessages`/`ModelMessage` (now async) |
| `zod-signup` | `required_error`/`invalid_type_error` → the `error` option; `z.string().email()` → `z.email()` |
| `zod-field-errors` | `error.flatten()` deprecated in favor of `z.flattenError()` (deprecation only: both pass) |
| `zod-enum` | `z.nativeEnum()` deprecated in favor of `z.enum()` (deprecation only: both pass) |
| `next-revalidate` | `revalidateTag(tag)` → `revalidateTag(tag, profile)` / `updateTag(tag)` |
| `next-proxy` | `middleware.ts` → `proxy.ts` (both still run in Next 16; the metric is which one is used) |

A session **passes** when `tsc --noEmit` succeeds on the whole project and the hidden tests in `tasks/<task>/hidden/` pass. The agent never sees those tests. Every task's reference solution in `tasks/<task>/solution/` passes, and the obvious stale versions fail (checked before the run). Secondary metrics:
- **stale in final code / first edit:** a task's stale-API patterns (`meta.json`) found in the agent's final files, or in its first Write/Edit.
- **deprecated:** use of a deprecated API.
- turns, cost and wall time, as Claude Code reports them.
- Context7 calls per session.

## Isolation

Sessions run as `claude -p --restricted --strict-mcp-config --permission-mode acceptEdits`:
- your settings, hooks, plugins and MCP servers are not loaded;
- your global and project CLAUDE.md are not loaded (`--restricted` turns off auto-discovery);
- file tools are confined to the session's workspace.

Each arm's instructions arrive the same way, through `--append-system-prompt-file`, so the only difference between arms is content. Workspaces are fresh copies of `template/` sharing one `node_modules` install.

## Run it

```bash
npm run build                    # the stalemap arm uses dist/cli.js
mkdir -p bench/.work/template && cp bench/template/*.json bench/.work/template/
(cd bench/.work/template && npm install --ignore-scripts)
npx tsx bench/run.ts --model claude-sonnet-4-5 --reps 1      # development tasks (tasks/)
# held-out suite (heldout/, see heldout/PROTOCOL.md); its pinned template needs its own install:
mkdir -p bench/.work/template-pinned && cp bench/heldout/templates/pinned/*.json bench/.work/template-pinned/
(cd bench/.work/template-pinned && npm install --ignore-scripts)
npx tsx bench/run.ts --suite heldout --arms alone,context7,stalemap-guard,context7-stalemap --examples --reps 3
# second held-out suite (heldout-v2/, see heldout-v2/PROTOCOL.md), with its own template:
mkdir -p bench/.work/template-heldout-v2-latest && cp bench/heldout-v2/templates/latest/*.json bench/.work/template-heldout-v2-latest/
(cd bench/.work/template-heldout-v2-latest && npm install --ignore-scripts)
npx tsx bench/heldout-v2/validate.ts                          # solutions pass, stale and starting files fail
npx tsx bench/run.ts --suite heldout-v2 --arms alone,context7,stalemap-guard,context7-stalemap --examples --reps 3
npx tsx bench/analyze.ts bench/results/<dir> --out bench/heldout-v2/RESULTS.md
npx tsx bench/run.ts --report bench/results/<dir>            # rebuild report.md from results.jsonl
# third held-out suite (heldout-v3/, see heldout-v3/PROTOCOL.md): sampled tasks, per-task notes, an oracle arm:
mkdir -p bench/.work/template-heldout-v3-latest && cp bench/heldout-v3/templates/latest/*.json bench/.work/template-heldout-v3-latest/
(cd bench/.work/template-heldout-v3-latest && npm install --ignore-scripts)
npx tsx bench/heldout-v3/validate.ts
npx tsx bench/run.ts --suite heldout-v3 --arms alone,context7,stalemap-guard,context7-stalemap,oracle --examples --reps 3
npx tsx bench/analyze.ts bench/results/<dir> --out bench/heldout-v3/RESULTS.md
# the stalemap-full arm's notes and search index, without sessions:
npx tsx bench/run.ts --suite heldout-v3 --arms stalemap-full --notes per-task --examples --notes-only --out <dir>
```

Sessions run on whatever Claude Code is signed in with (a Claude plan works). Reported costs are Claude Code's API-equivalent estimates. Transcripts go to `results/<dir>/runs/` (git-ignored).

## Running fast

Sessions are independent, so `--concurrency` sets the speed. What must not change with it is which arm wins, so run.ts guards against the ways load can hit one arm harder than another:

- **Limits.** A session that hit a plan or API limit at any point (a rejected `rate_limit_event`, a 429/529 retry, an API error) is thrown away and re-run from a fresh workspace, and new sessions pause meanwhile. `limitRetries` in results.jsonl counts them. `--stop-on-limit` stops instead (for pilots), and `--resume` continues a stopped run, skipping sessions already in results.jsonl.
- **Load.** Guard arms record each post-edit hook's wall time (`guardMs`), hook timeouts (60 s) and runs that hit the guard's own 25 s deadline (`guardIncomplete`: the agent saw no findings for that edit). Context7 arms record tool errors (rate limits included) and whether the server connected. analyze.ts prints them per arm under "Load safety", with a one-line check at the top.
- **Order.** Within each repetition, checks-mode sessions (the long ones) start first, arms still interleaved, so a run doesn't end on a long tail.

Several machines can split one run: `--shard i/n` runs every n-th task × mode × repetition block (all arms of a task together, so a slower machine can't favor an arm), into `results/<date>-<suite>-shard-i-of-n`. Then, on one machine with every shard's folder:

```bash
npx tsx bench/run.ts --merge bench/results/<run> bench/results/<run>-shard-1-of-2 bench/results/<run>-shard-2-of-2
```

The merge refuses shards that differ in stalemap commit or dist hash, Claude Code version, template installs (there's no lockfile, so install once and copy `bench/.work/template*`), run settings or notes, or that miss a session.

**Pilot** (2026-10-16, M1 Pro, 10 cores, 16 GB, with the usual desktop apps and four other Claude sessions open): 48 dev-suite sessions (6 tasks × 4 arms × 2 modes, results in `results/2026-10-16-pilot-c20/`) at `--concurrency 20` took 7.6 minutes, with no limit hits, errors, guard timeouts or Context7 disconnects.

- Memory: `claude -p` takes about 185 MB per session (3.9 GB for 20), the docs MCP servers about 1.2 GB, and node (guard, `tsc`, tests) up to 2.6 GB. Swap in use rose from 14 to 19 GB (back to 14 GB afterwards) and the load average peaked at 52.
- The guard hook takes 1.1 s on an idle machine. During the run it took 2–3 s (median) and 11 s at most, well inside its 25 s deadline.
- Time per turn: one-shot was unchanged (6.2 s against 5.5–6.5 s at concurrency 3). Checks was slower (7.6 s against 5.5–6.2 s), because `tsc` competes for CPU.

So 20 is about this Mac's ceiling. At that concurrency, 960 held-out sessions (about 75 s each under load, like v2's) take roughly 960 × 75 s / 20 ≈ 60 minutes plus a short tail. A second machine (`--shard`) brings that under an hour, but only if the account allows it: shards on one account share its plan limits. During the pilot the 5-hour window rose up to 6 points (other sessions were running too), so 960 sessions could exceed one window. run.ts then pauses and retries, or you can stop and `--resume` after the reset.

The Context7 arms need a Context7 API key: without one, the server uses a shared anonymous quota, and calls it refuses look like ordinary answers to the agent.

**Context7 key and preflight.** Export `CONTEXT7_API_KEY` (a free key from [context7.com/dashboard](https://context7.com/dashboard)) in the shell that runs `run.ts`; `arms/context7.mcp.json` passes it to the server, so it never goes into the repo or the results. Before any session, a run with a Context7 arm makes one short `claude-haiku-4-5` session that calls `resolve-library-id` through the same MCP config, and stops if the answer is a quota or rate limit, a rejected key, or no answer. `build.jsonl` records whether a key was set and the preflight's answer, never the key.

## Caveats

- The tasks, the harness and stalemap are by the same author. Read the tasks and judge for yourself.
- One model and few repetitions. Treat a pilot as directional, not significant.
- Context7 runs with the free tier's API key (see above). Without a key the harness refuses to start a Context7 arm, since the anonymous quota is shared.
- Task prompts are short and don't name the new APIs, so they lean on the model's knowledge. Real tasks in a codebase that already uses the new API are easier for every arm.
