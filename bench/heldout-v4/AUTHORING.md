# Writing a heldout-v4 task

How each task in [tasks/](tasks/) was built from a drawn change. The rules this follows are in [PROTOCOL.md](PROTOCOL.md); this is the procedure.

## Stay blind

Don't run stalemap, and don't read anything in `src/` or `dist/`, `bench/results/**`, any `stalemap-notes*.md`, `bench/arms/stalemap*.md`, `examples/`, any `RESULTS.md` or `POSTHOC.md`, the project memory under `~/.claude`, or other sessions' transcripts. The harness (`bench/run.ts`, `bench/analyze.ts`, `bench/arms/base.md`, `checks.md`, `tsc-hook.mjs`, the oracle arm) and every v1–v3 task folder are fine to read. Nothing about a task may be shaped by what stalemap does or doesn't catch.

## For each change you're given, in draw order

1. **Read the change** in `sampling/population.jsonl` and its source, and confirm it in the pinned package installed in `bench/.work/template-heldout-v4-latest/node_modules` (types, source, a quick script). Then find the old behavior: install the last version published before 2026-06-01 (the newest a model with a mid-2026 cutoff knows well; every task must be stale for both claude-sonnet-5-5 and claude-sonnet-4-5) in a scratch folder under `bench/.work/old/` and check what code written for it looked like. Never install into or change the template's `node_modules`.
2. **Skip or build.** If a skip criterion applies (S1–S8 in PROTOCOL.md), record the skip and move on. Check [sampling/spent.md](sampling/spent.md) first: a change a v1–v3 task was built from is an S5 skip. Don't skip because a task would be hard for an agent, easy for an agent, or because you guess how any arm would do: that's what's being measured.
3. **Build the task** (below), run `npx tsx bench/heldout-v4/validate.ts --tasks <name>` until it passes, and record the outcome.

Record each outcome as one line in `sampling/walk/<batch>.jsonl`, where `<batch>` names the group of changes you were given:

```json
{"id":"<change id>","outcome":"task","task":"<task folder>"}
{"id":"<change id>","outcome":"skip","criterion":"S2","reason":"One sentence: what it needs that the template can't provide."}
```

## The task folder

Name it `<package>-<short-slug>` (lowercase, no scope, at most about 32 characters), e.g. `express-redirect-args`.

- **`task.md`**: one to three sentences, in the words of a developer asking for a feature or a fix. Name the files to edit and the goal. Don't name the new API, the change, or the version it shipped in. An `upgrade` task may say which version the project upgraded from and to ("We upgraded X from 4 to 5 ..."), since that's what a developer would say, but not what changed.
- **`files/`**: the starting workspace, laid over the template's `package.json` and `tsconfig.json`. `tsc` checks only `src/`, `test/`, `app/` and top-level `*.ts` files, so put code there. A task may ship its own `tsconfig.json` (a TypeScript task usually does); it may override `package.json` only to add config fields such as `"jest"`, never dependencies, since every workspace shares the template's `node_modules`. Make it look like a small real project that already uses the package: the starting code imports or configures it (a stub that throws "not implemented", or, for an upgrade, the code that worked before). `files/test/visible/smoke.test.ts` checks only that the expected exports exist; it's what `npm test` runs besides `tsc`.
- **`hidden/`**: `node:test` + `node:assert/strict` tests, run as `tsx --test test/hidden/*.test.ts` from the workspace root, importing the agent's code by relative path (`../../src/...`). They're copied to `test/hidden/` before grading, so `tsc --noEmit` type-checks them along with the agent's code: they must compile against any correct solution (import the agent's module through `const load = (id: string): Promise<any> => import(id)` when its exact types may vary). Check behavior through the package's own code paths (its config loader, its renderer, its parser) rather than by reading the agent's source text. No network: stand up a local `node:http` server if the package talks to an API. Deterministic, and under 60 s on the solution. Any correct solution must pass, not just the reference: test the outcome the prompt asks for, not the way it's written.
- **`solution/`**: the reference solution, laid over `files/`. It may not delete files.
- **`stale/`**: what a model that knows only the pre-cutoff version would plausibly write for the same prompt: the old API, option, default or file convention. It must fail.
- **`alt/<name>/`**: at least one other correct solution, written differently from the reference (another valid API, structure or config form). Each must pass.
- **`meta.json`**:

  ```json
  {
    "title": "express 5.2: …",
    "template": "latest",
    "change": "<population id>",
    "package": "<package>",
    "scenario": "new-code",
    "changeType": "<type from the population>",
    "kind": "type-checks",
    "stale": ["<regex matching the stale variant's old API>"],
    "deprecated": ["<regex for a deprecated-but-working API, or empty>"],
    "newApi": ["<regex for the new API's name; task.md must not match>"],
    "oracle": "<one line naming the change, as a perfect note would>"
  }
  ```

  - `kind`: `compile-error` if the stale variant fails `tsc --noEmit`, `type-checks` if it compiles (validate.ts checks this);
  - `stale`: regexes (JavaScript, as strings) over every source, style and config file the agent writes, except tests and the lockfile. They must flag the stale variant and not the solution or any alternative. Where a default changed, flag code that relies on the old default (see v2's `next-image-defaults`);
  - `oracle`: at most one sentence and 240 characters, stating the change and what to do instead, e.g. "In example-lib 3.0, connect() returns a promise and no longer takes a callback; await it." It must not mention the task.

**Deprecations.** If the stale code still works, the hidden tests must fail it on the package's own deprecation signal: a runtime deprecation warning (capture `process.emitWarning` or `console.warn`), or TypeScript's deprecation diagnostic for the targeted symbol. The template's `typescript` is TypeScript 7, which has no compiler API, so use the TypeScript 6 compiler API that the template installs as `typescript-6` (`import ts from "typescript-6"`; diagnostic codes 6385 and 6387 from `getSuggestionDiagnostics`). If the package gives neither signal, skip under S7.

**Tests must not leak the answer.** The agent never sees `hidden/`, but it does see `files/`: keep the change's name out of the starting files and the smoke tests.

## Template

All tasks share `templates/latest`. If a task needs a package the template lacks, don't add it yourself: say so in your report, and leave that change unrecorded until it's decided.

## Notes from the v4 walk

- `validate.ts` (like run.ts) hands every file in `test/hidden/` to `tsx --test`, so a fixture or helper module there runs as a test. Write fixtures to a temp folder from inside the test instead.
- Every workspace shares the template's `node_modules` through a symlink, so tools that cache under `node_modules` (Vite's `.vite`/`.vite-temp`, Vitest's module cache, jiti's `.cache`) write into the shared install. Point their cache directories at a temp folder in hidden tests; the session that owns the suite clears any that appear before the suite is frozen.
- Old-version installs resolve today's transitive dependencies, which can be newer than the old version (better-auth 1.6.13 with kysely 0.29, framer-motion 12.40 with motion-dom 12.43). Pin the transitive package to one published before 2026-06-01 when it matters, and say so in the report.
- A full framework build inside a hidden test (`next build`) is allowed if it stays under the 60 s budget; build a copy of the workspace in a temp folder, because builds rewrite project files.
