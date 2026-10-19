# Held-out benchmark v3 protocol (pre-registered)

**Status: frozen on 2026-10-19. Draws 1–120 walked (62 tasks passing validate.ts, 58 recorded skips); setup amended on 2026-10-18 for the run (a `tsc-hook` arm, the second model, guard-ranked notes, limits and Context7 keys); the oracle pilot on 2026-10-19 dropped 3 tasks and fixed 1 ([PILOT.md](PILOT.md)), so the suite has 59 tasks, hashed under "Freeze".** This file is committed in stages. The sampling rules, seed and skip criteria below were committed before the change population was built. The task list, pilot results and hashes are added before the freeze. After the freeze, any change to tasks, grading or analysis goes under "Deviations", with a reason.

## Why a third suite

Two held-out suites came before this one. [v1](../heldout/) had 10 tasks the author picked; [v2](../heldout-v2/) had 10 blind tasks weighted toward changes a type checker can't catch. Ten tasks can only resolve differences of about 30 points, and neither suite was sampled to represent typical post-cutoff changes. v3 is the confirmatory test before any public claim: its tasks are sampled from the changes popular packages actually shipped after the cutoff, and there are enough of them to detect a 12-point difference.

## Question

On a random sample of post-cutoff changes in popular TypeScript packages, does stalemap (notes plus the edit-time guard) help a coding agent write working code more often than no help at all? Secondary: does it beat Context7, and does using both beat either alone?

## Blindness

The tasks were written by a session that did not run stalemap and did not read its generated notes or reports (`bench/results/**`, any `stalemap-notes*.md`), its notes renderer, guard, type differ or changelog reader (`src/render.ts`, `src/guard.ts`, `src/typediff.ts`, `src/changelog.ts`), or any earlier suite's `RESULTS.md` or `POSTHOC.md`. It read `bench/run.ts`, `bench/analyze.ts`, `bench/README.md`, the README's description of which dependencies a scan covers, and v2's protocol and tasks, for format. It knew one summary of v2: a tie on every pre-registered comparison (stalemap-guard 35%, alone 23%, Context7 27% pooled), with intervals that included zero. Later it read one results folder, the Haiku pre-pilot described under "Pilot", which holds only `alone` and `oracle` sessions and no stalemap output, and only the oracle sessions of the six tasks the oracle failed. The session that applied the pilot rule read the pilot folder (`alone` and `oracle` only), whose report shows both arms' pass rates, and the transcripts of the failed oracle sessions only; [PILOT.md](PILOT.md) lists what it read.

stalemap is being changed in parallel. The stalemap build under test is whatever is committed when the run starts, recorded by run.ts in `build.jsonl`. Changes to stalemap made by anyone who has read these tasks before the run are post hoc and are reported as a deviation.

## Sampling

### Frame: which packages

The frame is fixed by a rule rather than picked:

1. **Candidate pool.** [sampling/candidates.txt](sampling/candidates.txt) lists 141 npm packages that a TypeScript web or Node application commonly lists as a direct dependency, in 12 categories. It was written before any release notes were read. Two edits came after the first ranking (below) was seen and before the frame was chosen: meta-frameworks became their own category, split from UI frameworks, and `graphql`, `@apollo/client` and `@trpc/server` moved from "validation and data" to "state, data fetching and HTTP".
2. **Ranking.** Packages are ranked by how many `package.json` files on GitHub declare them: GitHub code search for `"<name>":` in files named `package.json`, run on 2026-10-16 ([sampling/frame.ts](sampling/frame.ts), results in [sampling/frame.json](sampling/frame.json)). The first draft ranked by npm downloads (week of 2026-10-05 to 2026-10-11, also recorded), but downloads count transitive installs: `ajv` had more than `zod` and `semver` more than four times `react`. Declarations count the projects that depend on a package directly. Packages from one project (`react`/`react-dom`, `prisma`/`@prisma/client`, `playwright`/`@playwright/test`, `langchain`/`@langchain/core`, `motion`/`framer-motion`) are ranked once, under the most-declared name.
3. **Qualifying.** A package qualifies if it has TypeScript types (bundled, or a DefinitelyTyped `@types` package) and at least one change in the window that meets the population rules below. A stable release that opens a new semver-major line (a new minor line below 1.0) qualifies without reading notes; otherwise the release notes decide. Before the declaration counts were in, release notes of `semver`, `ajv`, `ws`, `react`, `zod`, `express`, `jose`, `pg`, `minimatch` and `@modelcontextprotocol/sdk` were skimmed for this check.
4. **Choice.** The frame is the top-ranked qualifying package in each category: 12 packages.

| category | package | GitHub declarations | npm downloads (week) | pinned | qualifies because | higher-ranked, not qualifying |
|---|---|---|---|---|---|---|
| UI frameworks | `react` | 8.83M | 188M | 19.3.1 | 19.2 and 19.3 list behavior changes under "Notable changes" | – |
| meta-frameworks and routing | `next` | 2.41M | 68M | 16.4.2 | 16.0.0 opened a new major line | – |
| server | `express` | 3.58M | 145M | 5.3.0 | 5.2.0 added deprecation warnings | – |
| validation and data | `zod` | 1.54M | 346M | 4.6.7 | 4.x minors list "potentially breaking" fixes and deprecations | – |
| databases and ORMs | `mongoose` | 1.54M | 7M | 9.11.2 | 9.0.0 opened a new major line | – |
| state, data fetching and HTTP | `axios` | 3.51M | 119M | 1.20.0 | 1.20.0 lists "Breaking Changes & Deprecations" | – |
| UI components and styling | `lucide-react` | 2.37M | 109M | 1.57.0 | 0.x minors and 1.0.0 opened new major lines | – |
| AI and API SDKs | `openai` | 0.26M | 43M | 7.34.0 | 6.0.0 and 7.0.0 opened new major lines | – |
| auth and crypto | `next-auth` | 0.24M | 7M | 4.24.15 | 4.24.15 lists behavior changes | `jsonwebtoken` (its one release, 9.0.3, only bumped a dependency), `bcrypt` (no release in the window) |
| testing | `jest` | 1.29M | 47M | 30.5.2 | 30.x minors add deprecation warnings and change behavior | `@testing-library/react` (16.3.1 to 16.3.3 were bug fixes only) |
| build, lint and language | `typescript` | 7.95M | 309M | 7.0.2 | 6.0.2 and 7.0.2 opened new major lines | – |
| utilities | `dotenv` | 2.79M | 193M | 18.0.8 | 18.0.0 opened a new major line | – |

The pinned version is the newest stable release published on or before 2026-10-15 (`lucide-react` 1.58.0 came out on 2026-10-16).

### Window

Stable releases (no prerelease tag) published after 2025-07-31 (claude-sonnet-4-5's training cutoff) and on or before 2026-10-15, up to the version the template pins.

### Population: every change in the window

The population is every breaking, deprecation or default/behavior change the frame packages shipped in the window, one line per change in [sampling/population.jsonl](sampling/population.jsonl). It was built from each package's GitHub release notes, its changelog file, and, for every major release in the window, its official migration or upgrade guide, before the draw was computed and before any task was written.

An entry is a change of one of these types:

- **breaking:** the notes mark it breaking (a heading or label such as "Breaking changes", "Major changes", "BREAKING", ⚠️ or a conventional-commit `!`), it's in a migration guide for a major release, or it removes or renames a public export, option, config key, file convention or CLI flag, changes a public function's signature or return type, or raises the minimum supported Node.js, TypeScript or peer-dependency version;
- **deprecation:** the notes say a public API, option, config key or behavior is deprecated;
- **default-behavior:** a default value changed, in any section, or an existing public API now behaves differently for the same input and the notes present that as a change rather than a fix (outside a bug-fix section, or under a heading like "Notable changes" or "Behavior changes").

Not included: bug fixes (unless marked breaking or changing a default), new features that leave existing behavior alone, performance work, docs, tests, build and repository chores, dependency bumps not marked breaking, and changes only to APIs that were added inside the window. A change is counted once, at the first stable release in the window that shipped it, even if several notes describe it. Prereleases count only through the stable release that shipped them. One entry is one change: a bullet that lists several unrelated changes is split. Several changes of the same kind to items of the same kind in one release (icons renamed, aliases removed) are one entry for that release, listing the items; a task built from it uses one of them.

Each entry has an `id` (`<package>@<version>/<slug>`), the version and date of the release, its type, a one-line summary in our words, and the URL of the source.

### Draw

The order of the population is fixed by a seed chosen before the population was built: **20250731**. Each change's rank is `sha256("heldout-v3:20250731:<id>")`, lowest first ([sampling/draw.ts](sampling/draw.ts)). Because a rank depends only on the seed and the change's own id, adding or removing an entry never moves the others. [sampling/draw.md](sampling/draw.md) lists the full order.

### Walking the draw

Tasks are built by walking the order from the top. Every change walked gets one outcome in [sampling/walk/](sampling/walk/) (one file per package): a task, or a skip under one of these criteria, with a sentence of reason. No change is passed over without an outcome (`draw.ts --check` enforces it).

- **S1 not in code:** nothing an agent writes in a TypeScript project can depend on it (CLI output or flags only, logging, performance, telemetry, bundle size, dev-server UI).
- **S2 not runnable offline:** exercising it needs a browser, a database server or other external service, network access beyond localhost, an API key, or a native binary or platform the template can't install with `npm install --ignore-scripts`. A local HTTP stub standing in for a remote API is allowed.
- **S3 not in the pinned version:** the pinned version doesn't behave as the notes say (reverted, or only behind an opt-in flag).
- **S4 environment only:** a raised minimum Node.js, TypeScript or peer version, or a removed build format (CommonJS, UMD), with no API change. The template already meets the new minimum, so a task can't fail on it.
- **S5 duplicate:** the same change as an earlier task's, in the same or a sibling package.
- **S6 no natural task:** no plausible application code depends on it, for example error-message wording or behavior on malformed input only. The reason must say what was tried.
- **S7 no checkable deprecation:** a deprecation the package signals neither with a `@deprecated` tag that TypeScript reports nor with a runtime deprecation warning, so a test can't tell the old API from the new.
- **S8 can't be graded reliably:** the behavior is nondeterministic, timing-dependent or too slow (over 60 s) to test.

### How many tasks

v2's per-task differences in pass rate between arms had a standard deviation of about 0.28. A 12-point improvement is the smallest effect worth a public claim. With a normal approximation, 0.28 and 12 points need about 43 tasks for 80% power at two-sided α = 0.05; [sampling/power.ts](sampling/power.ts) simulates the analysis actually used (the two-level bootstrap below, 6 runs per arm per task, an alone arm near 23% with many tasks at floor or ceiling, calibrated to that SD):

| tasks | runs per arm per task | power at +12 points | at +10 | at +15 |
|---|---|---|---|---|
| 40 | 6 | 71% | | |
| 47 | 6 | 76% | 62% | 95% |
| 56 | 6 | 82% | 70% | 95% |
| 64 | 6 | 89% | | |
| 47 | 8 | 84% | | |
| 56 | 8 | 88% | | |

400 simulated suites per cell, so each figure is ±2 points.

**Target: at least 56 tasks**, about 82% power at +12 points. Walking draws 1–120 gave 62 tasks that pass validation (63 before the pre-freeze review turned one into an S6 skip), and the suite is every one of them that also passes the oracle pilot, not just the first 56: using every task from the walked draws leaves no cutoff to choose, and 62 tasks give close to the 64-task row's 89%. This was settled after the walk and before any session with stalemap or Context7. If the pilot drops tasks and fewer than 56 remain, the walk continues past draw 120 until 56 pass. The pilot dropped 3 tasks, leaving **59**, between the 56- and 64-task rows (82% and 89%), so the walk stops at draw 120.

## Tasks

Each task is a folder in [tasks/](tasks/), built from one drawn change:

- `task.md`: a short prompt (at most three sentences) in a user's words. It names the goal and the files to edit, not the new API or the change. An `upgrade` task may say which version the project moved from.
- `meta.json`: `title`, `template`, `change` (the population id), `package`, `scenario` (`new-code` or `upgrade`), `changeType` (`breaking`, `deprecation` or `default-behavior`, from the population), `kind`, `stale` and `deprecated` patterns as in v2, and `oracle`: the one-line hint the oracle arm gets, naming the change.
- `files/`: the starting workspace on top of the template, with visible smoke tests in `files/test/visible/`. The starting files import or configure the package the way a project using it would, so a scan of the workspace sees the dependency.
- `hidden/`: tests the agent never sees, run with `tsx --test`. They check behavior through the package's own code where possible, need no network, and finish in under 60 s.
- `solution/`: the reference solution, laid over `files/`.
- `stale/`: what a model with pre-cutoff knowledge would plausibly write.
- `alt/<name>/`: at least one other correct solution written differently, so the hidden tests don't just match the reference.

**Kind** is whatever the change gives, recorded per task: `compile-error` if the stale variant fails `tsc --noEmit`, `type-checks` if it compiles and only the hidden tests catch it. For a deprecation, the hidden tests fail when the code triggers the package's own deprecation signal (S7).

[validate.ts](validate.ts) checks every task as v2's did: the reference solution and every alternative pass `tsc --noEmit`, the hidden tests and the visible smoke tests and aren't flagged stale; the untouched starting files fail; the stale variant fails, is flagged by the stale patterns, and its `tsc` result matches `kind`; no solution deletes files; and the `oracle` hint and other meta fields are present.

## Setup

- **Model and agent:** `claude-sonnet-4-5` (training cutoff 2025-07-31), Claude Code headless (`claude -p`) as described in [../README.md](../README.md#isolation).
- **Where it runs:** on branch `bench/v3-run`, which merges this suite, frozen on `bench/heldout-v3`, with the stalemap build under test and the run harness. run.ts records the build in `build.jsonl`.
- **Template:** [templates/latest](templates/latest/) pins every frame package at its latest stable version on 2026-10-15, plus what they need. It installs with `npm install --ignore-scripts`.
- **Arms:**
  - `alone`: the shared rules only.
  - `context7`: plus the Context7 MCP server and its "always use Context7" rule.
  - `stalemap-guard`: plus stalemap's notes and its post-edit guard hook (compile errors only, the default).
  - `context7-stalemap`: both.
  - `oracle` (exploratory): the shared rules plus the task's one-line hint. It shows what perfect notes could do.
  - `tsc-hook` (exploratory): the shared rules plus a post-edit hook that runs the workspace's own `tsc --noEmit -p tsconfig.json` after each Write or Edit and shows the agent every error (`bench/arms/tsc-hook.mjs` on `bench/v3-run`), in the same hook slot and with the same 60 s timeout as the guard, with no notes and no hints. It asks whether stalemap's guard beats a plain type-check hook anyone can add. It runs interleaved with the confirmatory arms.

  `oracle` and `tsc-hook` are outside the decision rule and the completeness check.
- **Realistic notes:** stalemap's notes are generated once per task by `stalemap scan --examples --guard` (no `--all`) in a copy of the task's starting workspace, so the task's imports and config files decide which dependencies are covered, as for a user. They're saved to `notes/<task>-guard.md` in the results folder. Both arms that get notes (`stalemap-guard`, `context7-stalemap`) also run the guard, and `--guard` is how stalemap ranks its notes when its edit-time guard is installed: a real install made by `stalemap setup` gets that from the hooks it writes, but the bench workspace has no such hooks, so the flag says it. run.ts does this for `heldout-v3` only.
- **Context7:** its anonymous quota ran out during v1 and v2, which left those runs' Context7 arms with a dead tool. Here Context7 calls are spread over three API keys: each session runs on the key with the most calls left, and a session whose Context7 call is turned away (quota, rate limit or a rejected key) is discarded and re-run on another key, never scored. Before any session, a preflight Context7 call must return a library ID.
- **Modes:** `oneshot` (file tools only) and `checks` (can run `npm test`).
- **Repetitions:** 3 per task × arm × mode: 59 × 4 × 2 × 3 = 1,416 sessions for the confirmatory arms, plus 354 for `oracle` and 354 for `tsc-hook` (59 × 2 × 3 each). If plan limits force a smaller run, the number done is reported and the result is labeled incomplete.
- **Limits:** a session that hits a plan or API limit at any point, not only before its first tool call, is discarded and re-run from a fresh workspace, never scored. With `--stop-on-limit`, sessions already running finish and are saved, and `--resume` continues the run.
- **Second model (exploratory):** `claude-sonnet-5-5` (training cutoff 2026-06 per models.dev, released 2026-09-28), a current model trained on most of the window, to see whether such a model still gains from stalemap. Its notes come from the same scan with `--model claude-sonnet-5-5`, so they cover only changes after its own cutoff. Arms `alone`, `stalemap-guard` and `tsc-hook` in both modes (no Context7 arms, so the Context7 quota stays with the confirmatory run), 3 repetitions if plan usage allows, otherwise the number done is reported. It runs only after the confirmatory run, in its own results folder, and no claim rests on it. It replaces the optional `claude-haiku-4-5` run planned earlier.

## Pilot

Allowed before the freeze, only with the `alone` and `oracle` arms, never with stalemap. Its purpose is to drop tasks that are broken or impossible: a task the `oracle` arm can't pass is dropped, with the reason recorded in [PILOT.md](PILOT.md). Pilot results are never used to drop or change a task because of how `alone` did, and pilot sessions are not part of the confirmatory data. Plan usage is checked before any session, and the pilot stops at the first limit error (`run.ts --stop-on-limit`).

**Pre-pilot (informational).** On 2026-10-18 the `alone` and `oracle` arms ran once per task and mode with `claude-haiku-4-5` (`bench/results/2026-10-18-heldout-v3-prepilot-haiku/`). It isn't the pilot and never drops a task. The oracle failed in both modes on six tasks. Reading only those oracle sessions, two failures came from the task and were fixed before the freeze:

- `lucide-icon-shapes`: the hint now says `__iconData.node` is the same `[tag, attrs]` array `__iconNode` was (the oracle read it as a tree).
- `mongoose-failed-logins`: the prompt now says the count lives on the user document and the login route saves it, and the hidden test stubs `save()`, so a solution that also saves doesn't hang without a database (the oracle saved in its hook).

The other four were the model's own mistakes with APIs the hints don't touch (Node's module hooks in `jest-sql-require-hook`, next-auth's base normalizer in `nextauth-plus-address-login`, the Responses input-items list in `openai-transcript-pending`, zod's `.meta()` in `zod-assistant-tools`); those tasks are unchanged.

**Pilot.** On 2026-10-19 the `alone` and `oracle` arms ran once per task and mode with `claude-sonnet-4-5` on the 62-task suite (`bench/results/2026-10-19-heldout-v3-pilot/` on `bench/v3-run`; 248 sessions, no errors). The oracle passed 49/62 tasks in one-shot mode and 54/62 with checks, and failed both modes on four. "Can't pass" was read as no oracle session passing in either mode: one pass shows the task can be done. Each failed oracle session's code was rebuilt from its transcript and re-graded. Three failures were the model's own mistakes outside the hint, the same ones Haiku made, and those tasks were dropped: `jest-sql-require-hook`, `openai-transcript-pending` and `zod-assistant-tools`. One came from the task, and that task was fixed: `next-viewtransition-flag`'s hidden test recognized only React's `<ViewTransition name>` and rejected an inline `view-transition-name`, which morphs inside the transition that the layout's `<ViewTransition>` starts. The test now accepts either, the task has a second alternative, and both oracle sessions pass when re-graded. The 13 tasks the oracle failed in only one mode were kept. [PILOT.md](PILOT.md) has the evidence for each task.

## Metrics

- **Primary:** pass rate (`tsc --noEmit` and hidden tests).
- **Secondary:** stale API in final code and in first edit, deprecated API used, median cost, wall time and turns, Context7 calls, guard corrections.

## Analysis

`npx tsx bench/analyze.ts bench/results/<dir> --out bench/heldout-v3/RESULTS.md`, which has a `heldout-v3` path of its own.

- **Estimate:** for each task, the pass rate of each arm over all its runs; the difference between two arms is the mean over tasks of the per-task differences.
- **Interval:** a two-level bootstrap with 10,000 replicates and a fixed seed (20261016). Each replicate resamples tasks with replacement and then, within each drawn task, resamples that task's runs with replacement inside each arm × mode cell. Percentile intervals.
- **Primary comparison:** `stalemap-guard` vs `alone`, both modes pooled, every task in the suite, 95% interval.
- **Secondary comparisons,** each with a 98.3% interval (Bonferroni over three): `stalemap-guard` vs `context7`; `context7-stalemap` vs `context7`; `context7-stalemap` vs `stalemap-guard`.
- **Exploratory:** `context7` vs `alone`, `context7-stalemap` vs `alone`, `oracle` vs `alone`, `tsc-hook` vs `alone`, `stalemap-guard` vs `tsc-hook`; every comparison per mode; the primary comparison by kind, change type, package and scenario; the second model (`stalemap-guard` vs `alone`, `tsc-hook` vs `alone`, `stalemap-guard` vs `tsc-hook`).
- Sessions that end in an error are scored as failures. A task missing runs in an arm is left out of that comparison, and the report says so.
- Never pooled with v1, v2 or the development tasks.

## Decision rule

Fixed before any session ran. "Pooled" means both modes together.

1. **stalemap helps** only if the primary comparison's 95% interval lies above zero. If it lies below zero, stalemap hurts; otherwise the result is "not shown", whatever the point estimate.
2. **stalemap beats Context7** only if `stalemap-guard` vs `context7`'s 98.3% interval lies above zero; a tie supports at most "no difference shown".
3. **Using both beats either alone** only if `context7-stalemap` vs `context7` and `context7-stalemap` vs `stalemap-guard` are both wins at 98.3%. One win supports only "beats" that arm.
4. A claim about one mode, kind or package is exploratory and is labeled so.
5. A run with fewer than 3 repetitions in any task × arm × mode cell of the four confirmatory arms is reported as incomplete, and no claim rests on it.

## Freeze

Frozen on 2026-10-19, after the pilot ([PILOT.md](PILOT.md)): 59 tasks. Hashes are computed in `bench/heldout-v3`; each is the first 16 hex digits.

- **Suite** (`find tasks templates -type f | sort | xargs shasum -a 256 | shasum -a 256`): `baad45f75364869c`.
- **Template** (`find templates -type f | sort | xargs shasum -a 256 | shasum -a 256`): `b8aa5127fb0ae5ad`.
- **Each task** (`find tasks/<task> -type f | sort | xargs shasum -a 256 | shasum -a 256`): in the table.

Recompute them before the run starts. A mismatch, or any later change to a task, the template, grading or analysis, goes under "Deviations".

| task | hash |
|---|---|
| axios-download-redirects | `c96e448ff7dedea3` |
| axios-fetch-length-limits | `54244110079c8e40` |
| axios-upload-too-large | `3755306f74d322b8` |
| express-body-limit-upgrade | `7c8e5d505aa861fe` |
| lucide-crisp-strokes | `da73eb869b2f9ed9` |
| lucide-icon-shapes | `e2e6d313801336d1` |
| lucide-swiss-franc | `6a25701bbbfbdfee` |
| lucide-uploaded-icons | `ef3e15f849536bb6` |
| mongoose-article-slug | `b714df5a94c9b3d9` |
| mongoose-change-events | `6437313895a8aef2` |
| mongoose-failed-logins | `a52862f2bbe41b46` |
| mongoose-field-check | `57208f2ad5294ec9` |
| mongoose-meetup-rules | `a5c0e8f13b048c65` |
| mongoose-orders-by-id-time | `eafe4c476409190f` |
| mongoose-product-search | `76db5e2d6b34fa16` |
| mongoose-supplier-import | `29e08a23e813eb3a` |
| mongoose-user-input-type | `ba31558f80fac273` |
| next-amp-removed | `684c2c99eda846d0` |
| next-cachelife-cachetag | `f15dadf1310797e2` |
| next-config-custom-key | `c6a85a8d6cf02c9c` |
| next-custom-server-render | `8c4a2c9031ceb8ce` |
| next-experimental-ppr | `889cb3004d6f61f7` |
| next-experimental-turbo | `27408391fae19d24` |
| next-image-local-ip | `c97cc308b58c61c0` |
| next-image-max-redirects | `e20f7fa17d79d8fa` |
| next-image-quality | `813c583f4456c96e` |
| next-legacy-image | `59ebb109b5a854de` |
| next-metadata-route-args | `1736badeba994b1a` |
| next-middleware-proxy | `487956e60b017994` |
| next-root-params | `5149ef188f503e19` |
| next-turbopack-build-cache | `ecaef94d70777c24` |
| next-unrecognized-action | `63ccdf16420f768c` |
| next-viewtransition-flag | `e1279c8b559c463a` |
| nextauth-plus-address-login | `88a40ab041e907b9` |
| openai-realtime-reply | `d820a57c58bd1503` |
| ts-check-doc-examples | `7535af18198960e6` |
| ts-commonjs-build | `31b6ac324b8bb4fc` |
| ts-implicit-any-first | `6f06a4a4d144db76` |
| ts-library-build-output | `3e5921226e253ee6` |
| ts-nav-label-length | `7b749bd7d7c64c63` |
| ts-service-worker-types | `573129d47a1ade14` |
| ts-upgrade-browser-app | `8f7aff8939c3d021` |
| ts-upgrade-build-config | `748704280344e66e` |
| ts-upgrade-checkout-widget | `909671d3e36a46fb` |
| ts-upgrade-express-api | `02a1aa523fc42024` |
| ts-upgrade-json-imports | `4cb8174f03c4c489` |
| ts-upgrade-legacy-helpers | `00a68dad04548065` |
| ts-upgrade-parcel-tracking | `f93fa2af308ed43a` |
| ts-upgrade-path-aliases | `04d137f9c82b4e82` |
| ts-upgrade-slug-library | `f7a7d5e7e525ce19` |
| ts-upgrade-storefront-scripts | `42827501218569b2` |
| zod-body-validation | `5807a96c76f6d2d3` |
| zod-group-booking | `d394a4225b12c24c` |
| zod-localized-errors | `db0977d47ca0cfc7` |
| zod-partner-event-times | `a78aef7844acd88c` |
| zod-plugin-commands | `d0b264fa9bb19921` |
| zod-signup-strict-form | `959f633afd2066bf` |
| zod-theme-overrides | `3260df9b461f416e` |
| zod-upgrade-country-guard | `eb58f906feb69bcd` |

## Deviations

(none yet)
