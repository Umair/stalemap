# Brief for the task authors

The walk was split by package into batches; each batch's author got this brief plus a list of draw numbers and change ids, in draw order. Kept here so the walk can be checked.

## Blindness (hard rules)

Never run stalemap or any `claude` agent session. Never read anything in `src/` or `dist/`, `bench/results/**`, any `stalemap-notes*.md`, `bench/arms/stalemap*.md`, `examples/`, any `RESULTS.md` or `POSTHOC.md`, anything under `~/.claude`, `bench/.work/notes-*`, or other sessions' transcripts or notes. You may read `bench/heldout-v4/**`, every v1–v3 task folder and protocol/review/pilot file, `bench/run.ts`, `bench/analyze.ts`, `bench/arms/base.md`, `bench/arms/checks.md`, `bench/arms/tsc-hook.mjs`, `bench/arms/oracle`, and the public web, npm and GitHub. Nothing about a task may be shaped by what stalemap does or doesn't catch.

## Setup

Worktree: `/Users/umair/Projects/stalemap/.claude/worktrees/heldout-v4` (branch `bench/heldout-v4`). Run commands from the worktree root. The template is installed at `bench/.work/template-heldout-v4-latest` (never install into or change it). `npx tsx` works from the worktree root.

Read first: `bench/heldout-v4/PROTOCOL.md` (window, skip criteria S1–S8, task format), `bench/heldout-v4/AUTHORING.md` (the procedure; follow it exactly), `bench/heldout-v4/sampling/spent.md`, and two or three v3 tasks in `bench/heldout-v3/tasks/` for format (for example `axios-download-redirects`, `zod-signup-strict-form`, `next-config-custom-key`, `lucide-swiss-franc` for a deprecation, `mongoose-article-slug` for an upgrade). v3's `REVIEW.md` and `PILOT.md` show the mistakes reviewers caught; avoid them (stale variants that already failed on the old version, hidden tests that reject a correct alternative, prompts that leak the change).

## Walk your changes in the order given

For each change: read its entry in `sampling/population.jsonl` and its source; confirm it in the pinned package in the template's `node_modules`; install the **last version published before 2026-06-01** in `bench/.work/old/<package>-<version>/` and confirm what code written for it looked like. Then skip under one criterion (S1–S8, with one sentence of reason; S5 also covers a change any v1–v3 task was built from, per `spent.md`) or build a task. Don't skip because a task would be hard or easy for an agent.

Build tasks as AUTHORING.md says, in `bench/heldout-v4/tasks/<package>-<slug>/`, and run `npx tsx bench/heldout-v4/validate.ts --tasks <name>` until it passes. Also check the stale variant against the old version (overlay the old package on a copy of the workspace, or point a scratch workspace's `node_modules` at the old install plus the template's other packages): it should pass there, so it fails on the pinned version *because of the change*. Say in your report if it doesn't and why that's still right.

Record each outcome, in draw order, as one JSON line in `bench/heldout-v4/sampling/walk/<your-batch>.jsonl`:

```json
{"id":"<change id>","outcome":"task","task":"<task folder>"}
{"id":"<change id>","outcome":"skip","criterion":"S2","reason":"One sentence."}
```

If a task needs a package the template lacks, don't add it: leave that change without an outcome, stop walking your list there, and say so in your report (the walk must stay a prefix of the draw).

Don't edit files outside your task folders, your walk file and scratch folders under `bench/.work/`. Don't commit. Don't run `draw.ts` (it rewrites a shared file).

## Report

End with one line per change (draw number, id, outcome, task or criterion), the stale-on-old-version result for each task, and anything that needs a decision.
