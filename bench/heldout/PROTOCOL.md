# Held-out benchmark protocol (pre-registered)

Written before stalemap was run on any of these tasks. The task files and templates hash to `7da688b128b9fb81` (`find tasks templates -type f | sort | xargs shasum -a 256 | shasum -a 256`). Any later change to tasks, grading or analysis is listed under "Deviations" with a reason.

## Question

On API-change tasks it wasn't tuned on, does stalemap help a coding agent write working code more often, or more cheaply, than Context7 or no help at all? Does using both beat either alone?

## Setup

- **Model and agent:** `claude-sonnet-4-5` (training cutoff 2025-07-31), Claude Code headless (`claude -p`) as described in [../README.md](../README.md#isolation).
- **Tasks:** 10, in [tasks/](tasks/), each with hidden tests and a reference solution. The solutions pass, and the stale variants and unfixed upgrade code fail (checked before freezing):

| scenario | tasks |
|---|---|
| new code, latest versions | zod-record, zod-issues, zod-function, next-cache-components, ai-structured |
| project pinned to an older post-cutoff version | ai6-steps (`ai@6.0.308`), zod41-payment (`zod@4.1.13`) |
| upgrade existing code broken by a version bump | ai-upgrade (ai 4 → 7), zod-upgrade (zod 3 → 4), next-upgrade (Next 15 → 16) |

- **Arms:**
  - `alone`: the shared rules only.
  - `context7`: plus the Context7 MCP server and its "always use Context7" rule.
  - `stalemap-guard`: plus the block from `stalemap scan --all --examples` for the task's template, and stalemap's post-edit guard hook (compile errors only, the default).
  - `context7-stalemap`: both.
- **Modes:** `oneshot` (file tools only) and `checks` (can run `npm test`).
- **Limits:** a session that hits a plan or API limit before using any tool is retried after a backoff of 1 to 30 minutes, not scored.
- **Repetitions:** 3 per task × arm × mode, 240 sessions in all. If plan limits force a smaller run, the number of repetitions done is reported. Results from a partial run are not presented as complete.

## Metrics

- **Primary:** pass rate (`tsc --noEmit` and hidden tests), per arm, for each mode and pooled.
- **Secondary:** stale API in final code and in first edit; deprecated API used; median cost, wall time and turns; Context7 calls; guard corrections.

## Analysis and reporting

- Differences between arms are computed per task and summarized with a 95% bootstrap interval over tasks. A difference is called a win or a loss only when the interval excludes zero; otherwise it's a tie.
- Results are broken down by scenario as well as overall.
- Everything is published: every arm, every task, including tasks and scenarios where stalemap loses.
- The eight development tasks in `../tasks/` shaped stalemap's design and are reported separately. They are never pooled with these results.

## Deviations

(none yet)
