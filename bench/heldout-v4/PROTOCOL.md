# Held-out benchmark v4 protocol (pre-registered)

**Status: sampling rules fixed on 2026-10-20, before any release notes were read and before the population was built; frame and population (438 changes) fixed on 2026-10-20, before the draw was computed; draws 1–170 walked on 2026-10-20 (66 tasks passing validate.ts, 104 recorded skips). Reviewed on 2026-10-20 ([REVIEW.md](REVIEW.md)); the oracle pilot on 2026-10-20 dropped no task and fixed 1 ([PILOT.md](PILOT.md)); frozen on 2026-10-20 with 66 tasks, hashed under "Freeze".** This file is committed in stages, as v3's was. The frame rule, window, seed, population rules and skip criteria below were committed first. The frame table, population size, task list, pilot results and hashes are added before the freeze. After the freeze, any change to tasks, grading or analysis goes under "Deviations", with a reason.

## Why a fourth suite

v1–v3 were used while stalemap was being developed: their tasks and results shaped what stalemap does, so none of them can support a public claim. v4 is a fresh suite, written blind and fixed in advance, whose result is stalemap's launch claim. It follows [v3](../heldout-v3/PROTOCOL.md)'s method (a frame of popular packages fixed by rule, every change in a window, a seeded draw walked in order with every outcome recorded) with three differences: the window is after the primary model's training cutoff, so every task is stale for both models; the frame takes three packages per category instead of one, because the window is short; and the changes earlier suites were built from are excluded.

## Question

On a random sample of changes that popular TypeScript packages shipped after a current model's training cutoff, does stalemap (notes, the edit-time guard and its MCP search tool) help a coding agent write working code more often than no help at all? Secondary: does it beat a plain type-check hook anyone can add, and do the answers hold for an older model?

## Blindness

The tasks are written by a session that does not run stalemap and does not read anything in `src/` or `dist/`, `bench/results/**`, any `stalemap-notes*.md`, `bench/arms/stalemap*.md`, `examples/`, any `RESULTS.md` or `POSTHOC.md`, the project memory, or other sessions' transcripts or notes about stalemap's internals or results. It may read the harness (`bench/run.ts`, `bench/analyze.ts`, `bench/arms/base.md`, `bench/arms/checks.md`, `bench/arms/tsc-hook.mjs`, the oracle arm) and every v1–v3 task folder, protocol, review and pilot file. Nothing about a task may be shaped by what stalemap does or doesn't catch.

The stalemap build under test is frozen separately, as git tag `freeze/v4-final`, before the pilot. Changes to stalemap made by anyone who has read these tasks are post hoc and are reported as a deviation.

## Sampling

### Frame: which packages

Fixed by rule before any release notes were read:

1. **Candidate pool.** v3's [candidate pool](sampling/candidates.txt), unchanged: 141 npm packages in 12 categories, written before v3 read any release notes.
2. **Ranking.** v3's ranking, reused: how many `package.json` files on GitHub declare each package (GitHub code search, run on 2026-10-16; [v3's frame.json](../heldout-v3/sampling/frame.json)), with packages from one project ranked once under the most-declared name. The counts are four days old and are not refreshed: a week of change in code-search totals in the millions doesn't reorder a category in any way that matters, and reusing them means the ranking was fixed before v4 existed.
3. **Qualifying.** As in v3: a package qualifies if it has TypeScript types (bundled, or a DefinitelyTyped `@types` package) and at least one change in the window that meets the population rules below. A stable release in the window that opens a new semver-major line (a new minor line below 1.0) qualifies without reading notes; otherwise the release notes decide, read in rank order within each category until the category is filled.
4. **Choice.** The frame is the **top 3 qualifying packages in each category**: 36 packages. If the population built from them has fewer than about 150 changes (fewer than 150), the frame becomes the top 4 per category, and the fourth packages' changes are added before the draw is computed. **The population has 438 changes, so the frame stays at the top 3** (the fourth qualifiers were identified but their changes weren't collected).

[sampling/frame.ts](sampling/frame.ts) refreshed each candidate's npm registry data for the v4 window (releases, new major lines, types) on 2026-10-20 and wrote [sampling/frame.json](sampling/frame.json). Qualifying was read in rank order by one researcher per category ([sampling/qualifying/](sampling/qualifying/), brief in [sampling/RESEARCH-BRIEF.md](sampling/RESEARCH-BRIEF.md)). Three categories have only two qualifying packages, so the frame has **33 packages**:

| category | frame (rank order) | higher-ranked, not qualifying | next qualifier (not in the frame) |
|---|---|---|---|
| UI frameworks | `react` (with `react-dom`) 19.3.1, `preact` 11.0.1 | `vue`, `@angular/core`, `svelte`, `solid-js`: fixes and features only | none (all six candidates read) |
| meta-frameworks and routing | `next` 16.4.2, `react-router` 8.5.0, `astro` 7.4.1 | – | `@sveltejs/kit` |
| server | `express` 5.3.0, `multer` 2.4.0, `helmet` 8.3.0 | `cors` (no release), `socket.io` (fixes only) | `@nestjs/core` |
| validation and data | `zod` 4.6.7, `valibot` 1.5.0 | `yup`, `class-validator`, `ajv`, `superjson` (no release), `joi` (fixes only) | none |
| databases and ORMs | `pg` 8.23.1, `prisma` (with `@prisma/client`) 7.10.1, `firebase` 13.0.0 | `mongoose` (fixes, types and features only) | `@supabase/supabase-js` |
| state, data fetching and HTTP | `axios` 1.20.0, `@tanstack/react-query` 5.104.5, `@reduxjs/toolkit` 2.13.0 | `rxjs` (no release) | `@apollo/client` |
| UI components and styling | `lucide-react` 1.59.0, `framer-motion` (with `motion`) 14.4.0, `react-hook-form` 7.90.0 | `clsx`, `class-variance-authority` (no release), `tailwind-merge` (features and fixes only) | `recharts` |
| AI and API SDKs | `openai` 7.39.0, `stripe` 23.0.0, `@google/genai` 2.30.0 | – | `@modelcontextprotocol/sdk` |
| auth and crypto | `next-auth` 4.24.15, `better-auth` 1.7.11 | `jsonwebtoken`, `bcrypt` (no release), `jose` (fixes only) | none (all five candidates read) |
| testing | `jest` 30.5.2, `vitest` 5.0.5, `jsdom` 30.1.3 | `@testing-library/react` (one fix release) | `mocha` |
| build, lint and language | `typescript` 7.0.2, `eslint` 10.13.0, `vite` 8.3.4 | – | `tailwindcss` |
| utilities | `dotenv` 18.0.8, `moment` 2.31.0, `nodemailer` 10.1.7 | `date-fns`, `lodash` (no release), `uuid` (fixes only) | `sharp` |

The version shown is the one the template pins. Judgment calls made while qualifying, each recorded in the category's file: a candidate is the npm package named, not its whole project (`@angular/core` doesn't qualify on a deprecation in `@angular/common`, as v3 left `react-server-dom-*` out of `react`); `helmet` qualifies on a thin "Changed" entry (CSP directive names it used to accept now throw); `moment` qualifies on locale-data changes listed under "Updates to existing locales", not under fixes; `eslint` qualifies on rules that report new cases, listed under Features.

### Window

Stable releases (no prerelease tag) published after 2026-06-30 (the training cutoff of `claude-sonnet-5-5`, the primary model) and on or before 2026-10-19, up to the version the template pins: the newest stable release published on or before 2026-10-19. Every change in the window is after both models' cutoffs (`claude-sonnet-4-5`'s is 2025-07-31).

"Old behavior" (what a model with pre-cutoff knowledge would write) means the last version published before 2026-06-01.

### Population: every change in the window

As in v3. The population is every breaking, deprecation or default/behavior change the frame packages shipped in the window, one line per change in `sampling/population.jsonl`, built from each package's GitHub release notes, its changelog file and, for every major release in the window, its official migration or upgrade guide, before the draw is computed and before any task is written. The procedure is in [sampling/POPULATION.md](sampling/POPULATION.md).

An entry is a change of one of these types:

- **breaking:** the notes mark it breaking (a heading or label such as "Breaking changes", "Major changes", "BREAKING", ⚠️ or a conventional-commit `!`), it's in a migration guide for a major release, or it removes or renames a public export, option, config key, file convention or CLI flag, changes a public function's signature or return type, or raises the minimum supported Node.js, TypeScript or peer-dependency version;
- **deprecation:** the notes say a public API, option, config key or behavior is deprecated;
- **default-behavior:** a default value changed, in any section, or an existing public API now behaves differently for the same input and the notes present that as a change rather than a fix (outside a bug-fix section, or under a heading like "Notable changes" or "Behavior changes").

Not included: bug fixes (unless marked breaking or changing a default), new features that leave existing behavior alone, performance work, docs, tests, build and repository chores, dependency bumps not marked breaking, and changes only to APIs that were added inside the window. A change is counted once, at the first stable release in the window that shipped it. Prereleases count only through the stable release that shipped them. One entry is one change; several changes of the same kind to items of the same kind in one release are one entry, listing the items.

Each entry has an `id` (`<package>@<version>/<slug>`), the version and date of the release, its type, a one-line summary in our words, and the URL of the source. Where v3's population had the same change, the entry keeps v3's id, so earlier suites' spent changes match by id. One researcher choice was reversed before the draw: `next` 16.3.0's removed experimental keys had been split into two entries so v3's spent entry kept its wording; under the same-kind rule they are one entry, under v3's id ([sampling/population/next.sources.md](sampling/population/next.sources.md)).

### Draw

The order of the population is fixed by a seed chosen before the population was built: **20260630**. Each change's rank is `sha256("heldout-v4:20260630:<id>")`, lowest first ([sampling/draw.ts](sampling/draw.ts)). A rank depends only on the seed and the change's own id, so adding or removing an entry never moves the others. `sampling/draw.md` lists the full order.

### Walking the draw

Tasks are built by walking the order from the top. Every change walked gets one outcome in `sampling/walk/`: a task, or a skip under one of these criteria, with a sentence of reason. No change is passed over without an outcome (`draw.ts --check` enforces it). The criteria are v3's, with S5 widened to the changes earlier suites spent:

- **S1 not in code:** nothing an agent writes in a TypeScript project can depend on it (CLI output or flags only, logging, performance, telemetry, bundle size, dev-server UI).
- **S2 not runnable offline:** exercising it needs a browser, a database server or other external service, network access beyond localhost, an API key, or a native binary or platform the template can't install with `npm install --ignore-scripts`. A local HTTP stub standing in for a remote API is allowed.
- **S3 not in the pinned version:** the pinned version doesn't behave as the notes say (reverted, or only behind an opt-in flag).
- **S4 environment only:** a raised minimum Node.js, TypeScript or peer version, or a removed build format (CommonJS, UMD), with no API change.
- **S5 duplicate or spent:** the same change as an earlier v4 task's, in the same or a sibling package, or a change that any v1, v2 or v3 task was built from ([sampling/spent.md](sampling/spent.md) lists them). Spent changes are recorded as skips when the walk reaches them; they are not removed from the population.
- **S6 no natural task:** no plausible application code depends on it, for example error-message wording or behavior on malformed input only. The reason must say what was tried.
- **S7 no checkable deprecation:** a deprecation the package signals neither with a `@deprecated` tag that TypeScript reports nor with a runtime deprecation warning.
- **S8 can't be graded reliably:** the behavior is nondeterministic, timing-dependent or too slow (over 60 s) to test.

A change isn't skipped because a task would be hard or easy for an agent, or because of a guess about how any arm would do.

### How many tasks

At least 56 tasks that pass `validate.ts`; the walk aims for about 64 so the pilot can drop a few and leave at least 56. The walk reached 66 at draw 170 and stops there. The suite is every walked task that passes validation and the pilot, not a chosen subset. If the pilot leaves fewer than 56, the walk continues in draw order until 56 remain. The power note is in [sampling/POWER.md](sampling/POWER.md).

### The walk

Draws 1–170 were walked by thirteen authors working in parallel, one batch of packages each, under one brief ([sampling/WALK-BRIEF.md](sampling/WALK-BRIEF.md)); outcomes are in [sampling/walk/](sampling/walk/), and `draw.ts --check` confirms the walk is a prefix of the order with no change passed over. The first batch covered draws 1–150; with 51 tasks from the first 126 outcomes, draws 151–170 were added so the walk would reach about 64 tasks. No agent session had run on any task when that was decided.

| outcome | count |
|---|---|
| task | 66 |
| S1 not in code | 9 |
| S2 not runnable offline | 10 |
| S3 not in the pinned version | 5 |
| S4 environment only | 6 |
| S5 duplicate or spent | 18 |
| S6 no natural task | 49 |
| S7 no checkable deprecation | 6 |
| S8 can't be graded reliably | 1 |

Of the 18 S5 skips, 15 are changes a v3 task was built from (by id); two are judged the same change as a v3 task's under another id (`typescript@7.0.2/remove-esmoduleinterop-false`, the TS5108 error v3's `ts-upgrade-express-api` was built from under its 6.0 deprecation id, and `typescript@7.0.2/remove-amd-module-directive`, which only breaks through the spent removal of `module amd`); one (`vite@8.3.0/config-json-named-import-warning`) duplicates the warning v4's `vite-admin-page-build` tests.

**Walk rulings** (made by the session that owned the suite while the walk ran; each is recorded in the outcome's reason):

1. **A change that ships only in a sibling package outside the frame is S3.** The frame is the npm package named (the qualifying rule above). Two drawn changes live in packages the frame and the template don't include: `better-auth@1.7.0/scim-decoupled-from-organization` (in `@better-auth/scim`) and `vitest@5.0.0/html-reporter-outputdir` (the html reporter in `@vitest/ui`; vitest itself never reads the option). Both are S3: the pinned frame package doesn't behave as the entry says. Code in a dependency that the frame package re-exports (`@better-auth/core` through `better-auth`, `cookie` through `astro`, vitest's own coverage base class) counts as in scope. The alternative, adding those packages to the template, would extend the frame beyond its rule.
2. Population summaries that turned out inaccurate when the walk checked the installed packages (for example `react@19.3.0/formdata-uses-submitter`, `@tanstack/react-query@5.102.0/use-prefetch-query-uses-query`) were left as written: an entry's rank depends only on its id, and the walk's outcome records what was found.
3. **Draw 122 was built twice.** `vite@8.2.0/config-native-loader-incompat-warnings` was first built as `vite-src-alias-config`: add an `@/` alias for `src/` in `vite.config.ts`, with a stale variant using `path.resolve(__dirname, "./src")` and the same config-loader-warning hidden test. That design passed `validate.ts` but was never committed; it was replaced by `vite-admin-page-build`, a multi-page build with the same stale idiom (`resolve(__dirname, …)`) and the same warning check. The author didn't record a reason. No agent session had run on either design, and the change's single outcome is the committed task. Found by the independent review ([REVIEW.md](REVIEW.md), S3) from leftover validate workspaces.

### Tasks in the walk

66 tasks: 42 `type-checks` and 24 `compile-error`; 34 from breaking changes, 25 from default/behavior changes and 7 from deprecations; 51 `new-code` and 15 `upgrade`. By package: `better-auth` and `vitest` 10 each, `firebase` 8, `stripe` 5, `next`, `typescript` and `eslint` 4 each, `preact` 3, `zod`, `dotenv`, `multer`, `nodemailer`, `react-hook-form` and `@tanstack/react-query` 2 each, and one each for `react`, `react-router`, `next-auth`, `express`, `vite` and `jest`.

| draw | task | change | type | kind | scenario |
|---|---|---|---|---|---|
| 2 | `vitest-slug-case-names` | `vitest@5.0.0/each-title-strings-unquoted` | breaking | type-checks | new-code |
| 3 | `zod-widget-grid-pairs` | `zod@4.5.0/from-json-schema-tuples-open-ended` | default-behavior | type-checks | new-code |
| 4 | `stripe-order-state` | `stripe@22.4.0/open-enums-otherstring` | breaking | compile-error | new-code |
| 6 | `next-og-share-card` | `next@16.3.0/edge-runtime-deprecated` | deprecation | type-checks | new-code |
| 7 | `nodemailer-relay-reconnect` | `nodemailer@10.1.0/idle-close-emits-end-only` | default-behavior | type-checks | new-code |
| 11 | `multer-parts-cap-upgrade` | `multer@2.4.0/parts-limit-inclusive` | default-behavior | type-checks | upgrade |
| 16 | `dotenv-applied-env-keys` | `dotenv@18.0.8/populate-output-values-maybe-undefined` | breaking | compile-error | new-code |
| 18 | `stripe-capability-badge` | `stripe@23.0.0/response-enums-new-values` | breaking | compile-error | new-code |
| 21 | `vitest-full-case-titles` | `vitest@5.0.0/pretty-format-inspection` | breaking | type-checks | new-code |
| 25 | `vitest-dom-project-platform` | `vitest@5.0.0/inline-projects-share-vite-server` | default-behavior | type-checks | new-code |
| 26 | `ts-upgrade-site-generator` | `typescript@7.0.2/js-commonjs-patterns-dropped` | breaking | compile-error | upgrade |
| 32 | `vitest-restock-flow-order` | `vitest@5.0.0/sequential-api-removed` | breaking | compile-error | new-code |
| 33 | `zod-typed-queue-jobs` | `zod@4.5.0/compat-type-aliases-deprecation-surfaced` | deprecation | type-checks | new-code |
| 34 | `firebase-live-mic-audio` | `firebase@13.0.0/ai-deprecated-apis-removed` | breaking | compile-error | new-code |
| 35 | `preact-tally-reset-all` | `preact@11.0.0/refs-forwarded-by-default` | breaking | type-checks | new-code |
| 36 | `preact-help-shortcut` | `preact@11.0.0/useeffect-unmount-cleanup-deferred` | breaking | type-checks | new-code |
| 37 | `better-auth-lean-sqlite-schema` | `better-auth@1.7.3/schema-validation-on-init` | default-behavior | type-checks | new-code |
| 39 | `stripe-webhook-replay` | `stripe@23.0.0/verifyheader-default-tolerance` | breaking | type-checks | new-code |
| 47 | `vitest-ci-test-settings` | `vitest@5.0.0/resolveconfig-returns-vite-config` | breaking | compile-error | new-code |
| 48 | `react-router-download-links` | `react-router@8.3.0/path-params-rfc3986-encoding` | default-behavior | type-checks | new-code |
| 49 | `better-auth-acme-sso` | `better-auth@1.7.0/generic-oauth-pkce-default` | default-behavior | type-checks | new-code |
| 51 | `jest-fixture-path-helper` | `jest@30.5.0/source-map-getcallsite-deprecated` | deprecation | type-checks | new-code |
| 55 | `preact-activity-heatmap` | `preact@11.0.0/compat-non-dimensional-props` | default-behavior | type-checks | new-code |
| 57 | `vitest-coverage-upgrade` | `vitest@5.0.0/coverage-include-exclude-relative` | breaking | type-checks | upgrade |
| 60 | `next-account-page-build` | `next@16.3.0/unstable-instant-renamed` | breaking | type-checks | new-code |
| 63 | `vitest-list-test-names` | `vitest@5.0.0/experimental-api-methods-deprecated` | deprecation | type-checks | new-code |
| 64 | `better-auth-shared-rate-limit` | `better-auth@1.7.0/rate-limit-storage-consume-required` | breaking | compile-error | new-code |
| 67 | `next-bundle-tree-shaking` | `next@16.3.0/turbopacktreeshaking-renamed` | breaking | compile-error | new-code |
| 68 | `better-auth-cancel-magic-link` | `better-auth@1.7.7/magic-link-verification-prefixes` | default-behavior | type-checks | new-code |
| 69 | `stripe-card-decline` | `stripe@23.0.0/errortype-removed` | breaking | compile-error | new-code |
| 76 | `ts-upgrade-session-types` | `typescript@7.0.2/skiplibcheck-conflict-errors-all-sites` | default-behavior | compile-error | upgrade |
| 77 | `ts-upgrade-status-badges` | `typescript@7.0.2/remove-allowsyntheticdefaultimports-false` | breaking | compile-error | upgrade |
| 79 | `firebase-template-request` | `firebase@13.0.0/ai-template-request-object` | breaking | compile-error | new-code |
| 83 | `better-auth-mobile-id-token` | `better-auth@1.7.0/upstream-provider-verifyidtoken-removed` | breaking | type-checks | new-code |
| 85 | `firebase-hybrid-cloud-model` | `firebase@13.0.0/ai-hybrid-default-model` | default-behavior | type-checks | upgrade |
| 86 | `ts-upgrade-shipping-quotes` | `typescript@7.0.2/js-jsdoc-types-and-tags-dropped` | breaking | compile-error | upgrade |
| 88 | `react-crawler-render` | `react@19.3.0/ssr-no-onallready-after-shell-error` | default-behavior | type-checks | new-code |
| 90 | `firebase-product-image` | `firebase@12.18.0/ai-imagen-removed` | breaking | compile-error | new-code |
| 91 | `better-auth-session-history` | `better-auth@1.7.0/signout-secondary-storage-runs-delete-hooks` | default-behavior | type-checks | new-code |
| 96 | `better-auth-long-password-login` | `better-auth@1.7.6/password-too-long-on-sign-in` | default-behavior | type-checks | new-code |
| 98 | `firebase-chat-or-model` | `firebase@13.0.0/ai-chatsession-interface` | breaking | compile-error | new-code |
| 99 | `eslint-upgrade-chart-registry` | `eslint@10.11.0/object-shorthand-ignoreconstructors-quoted` | default-behavior | type-checks | upgrade |
| 101 | `better-auth-proxy-reset-links` | `better-auth@1.7.0/dynamic-baseurl-ignores-forwarded-headers` | breaking | type-checks | new-code |
| 105 | `nextauth-tenant-redirect` | `next-auth@4.24.15/nextauth-url-wins-over-forwarded-host` | default-behavior | type-checks | new-code |
| 107 | `eslint-upgrade-rollout-weights` | `eslint@10.9.0/no-loss-of-precision-underflow` | default-behavior | type-checks | upgrade |
| 109 | `next-upgrade-focus-config` | `next@16.4.0/appnewscrollhandler-flag-removed` | breaking | type-checks | upgrade |
| 110 | `vitest-kiosk-env-teardown` | `vitest@5.0.0/populateglobal-originals-descriptors` | breaking | type-checks | new-code |
| 111 | `firebase-coupon-error-reason` | `firebase@12.18.0/functionserror-status-in-message` | default-behavior | type-checks | new-code |
| 112 | `eslint-upgrade-model-mixins` | `eslint@10.10.0/no-extra-bind-class-fields-static-blocks` | default-behavior | type-checks | upgrade |
| 114 | `multer-file-count-upgrade` | `multer@2.4.0/limits-validated-at-construction` | default-behavior | type-checks | upgrade |
| 116 | `react-query-project-loader` | `@tanstack/react-query@5.102.0/imperative-fetch-methods-deprecated` | deprecation | type-checks | new-code |
| 120 | `firebase-team-member-role` | `firebase@13.0.0/firestore-updatedata-indexed-types` | breaking | compile-error | new-code |
| 121 | `nodemailer-relay-greet-pause` | `nodemailer@10.1.0/connection-timeout-covers-setup` | default-behavior | type-checks | upgrade |
| 122 | `vite-admin-page-build` | `vite@8.2.0/config-native-loader-incompat-warnings` | deprecation | type-checks | new-code |
| 124 | `eslint-upgrade-job-runner` | `eslint@10.11.0/no-unsafe-finally-labeled-continue` | default-behavior | type-checks | upgrade |
| 125 | `rhf-quiz-correct-answer` | `react-hook-form@7.83.0/path-types-depth-capped-at-10` | default-behavior | compile-error | new-code |
| 128 | `express-report-download-name` | `express@5.3.0/content-disposition-unquoted-token` | default-behavior | type-checks | new-code |
| 130 | `vitest-ci-attachments` | `vitest@5.0.0/attachmentsdir-root-only` | breaking | type-checks | new-code |
| 135 | `dotenv-quiet-loader` | `dotenv@18.0.0/code-options-beat-env-vars` | default-behavior | type-checks | new-code |
| 136 | `better-auth-gateway-token-exchange` | `better-auth@1.7.0/sync-oauth2-request-builders-removed` | breaking | compile-error | new-code |
| 141 | `rhf-submit-error-toast` | `react-hook-form@7.84.0/handle-submit-returns-onvalid-result` | breaking | compile-error | new-code |
| 148 | `better-auth-microsoft-any-tenant` | `better-auth@1.7.0/microsoft-entra-helper-tenant-guid` | breaking | type-checks | new-code |
| 149 | `vitest-module-cache-dir` | `vitest@5.0.0/experimental-fsmodulecache-deprecated` | deprecation | compile-error | new-code |
| 157 | `react-query-product-suspense` | `@tanstack/react-query@5.102.0/prefetch-in-render-removed` | breaking | compile-error | upgrade |
| 161 | `firebase-vertex-region` | `firebase@13.0.0/ai-vertexaibackend-removed` | breaking | compile-error | new-code |
| 170 | `stripe-card-only-checkout` | `stripe@23.0.0/payment-method-types-param-removed` | breaking | compile-error | new-code |

## Tasks

As in v3 ([AUTHORING.md](AUTHORING.md) has the procedure). Each task is a folder in `tasks/` built from one drawn change: `task.md` (a prompt of at most three sentences in a user's words, naming the goal and files, not the new API or the change), `meta.json` (`title`, `template`, `change`, `package`, `scenario`, `changeType`, `kind`, `stale`, `deprecated`, `newApi`, `oracle`), `files/` (the starting workspace with visible smoke tests), `hidden/` (tests the agent never sees), `solution/`, `stale/` (what a model with pre-cutoff knowledge would plausibly write) and at least one `alt/<name>/`.

[validate.ts](validate.ts) checks every task as v3's did: the reference solution and every alternative pass `tsc --noEmit`, the hidden tests and the visible smoke tests and aren't flagged stale; the untouched starting files fail; the stale variant fails, is flagged by the stale patterns, and its `tsc` result matches `kind`; no solution deletes files; the meta fields are present; and the task's change is in the population, recorded for that task in the walk, and not a spent change.

## Setup

- **Template:** [templates/latest](templates/latest/) pins every frame package at its newest stable release on or before 2026-10-19, plus what tasks need (such as `typescript-6` for deprecation checks). It installs with `npm install --ignore-scripts` under `bench/.work/template-heldout-v4-latest`.
- **Node.js:** the benchmark and `validate.ts` run on Node 22.22.3. firebase 13's packages (`@firebase/ai` 3.0.0, `@firebase/app` 0.16.3, `@firebase/firestore` 4.18.0) declare `engines.node >=24.12.0`, so the 8 firebase tasks run on a runtime firebase doesn't support. The suite stays on 22.22: `validate.ts` gives identical results for all 66 tasks on Node 24.18.0 (checked by the independent review), and moving to Node 24 would invalidate the walk's Node-22-based S2 skip of `jest@30.5.0/esm-graph-errors-before-cjs-execution` (draw 71, whose new behavior needs Node 24.9+).
- **Arms:**
  - `alone`: the shared rules only.
  - `stalemap-full`: stalemap's notes, its edit-time guard and its MCP search tool, generated with `--examples --guides`, from the build frozen as git tag `freeze/v4-final` before the pilot.
  - `tsc-hook`: a plain `tsc --noEmit` after each edit, showing the agent every error, with no notes and no hints.
  - `oracle`: the shared rules plus a one-line hint naming the change. Used in the pilot and as a ceiling.
  - `context7` (exploratory): the Context7 MCP server. Never part of a public claim.
  - `context7-stalemap` (exploratory): Context7 plus `stalemap-full` together. Never part of a public claim.

  Both Context7 arms run on the primary model (`claude-sonnet-5-5`). Running them on `claude-sonnet-4-5` as well is optional and exploratory, depending on the Context7 call budget.
- **Models:** `claude-sonnet-5-5` (primary) and `claude-sonnet-4-5` (secondary).
- **Modes:** `oneshot` (file tools only) and `checks` (can run `npm test`).
- **Repetitions:** 3 per task, arm, mode and model.

## Pilot

Allowed before the freeze, with the `alone` and `oracle` arms only, both models, both modes, 1 repetition. A task the oracle fails in every primary-model (`claude-sonnet-5-5`) pilot session is dropped, as in v3, and so is a task that turns out to be broken (a hidden test that rejects a correct solution, a starting workspace that doesn't build); a broken task may be fixed instead of dropped when the fix keeps the prompt's goal and the drawn change. Pilot results are never used to drop or change a task because of how `alone` did. Pilot sessions are not part of the confirmatory data. Decisions and evidence go in `PILOT.md`.

## Metrics

- **Primary:** pass rate (`tsc --noEmit` and the hidden tests).
- **Secondary:** stale API in final code and in the first edit, deprecated API used, median cost, wall time and turns.

## Analysis

- **Estimate:** for each task, the pass rate of each arm over all its runs; the difference between two arms is the mean over tasks of the per-task differences.
- **Interval:** a two-level bootstrap (tasks, then runs within each drawn task's arm × mode cells) with 10,000 replicates and a fixed seed; percentile intervals.
- **Primary comparison:** `stalemap-full` vs `alone` on `claude-sonnet-5-5`, both modes pooled, every task in the suite, 95% interval. A win if the interval excludes 0 on the positive side; below 0 means stalemap hurts; otherwise "not shown".
- **Secondary comparisons,** each with a 98.3% interval (Bonferroni over three):
  1. `stalemap-full` vs `tsc-hook` on `claude-sonnet-5-5`, pooled;
  2. `stalemap-full` vs `alone` on `claude-sonnet-4-5`, pooled;
  3. `stalemap-full` vs `tsc-hook` on `claude-sonnet-4-5`, pooled.
- **Exploratory:** per-mode results, turns, cost, stale first edits, and everything with `context7` or `context7-stalemap`.
- Sessions that end in an error are scored as failures. A task missing runs in an arm is left out of that comparison, and the report says so. Never pooled with v1–v3 or the development tasks.

## Freeze

Frozen on 2026-10-20, after the pilot ([PILOT.md](PILOT.md)): 66 tasks. Hashes are computed in `bench/heldout-v4`; each is the first 16 hex digits.

- **Suite** (`find tasks templates -type f | sort | xargs shasum -a 256 | shasum -a 256`): `a8cf5ba6ac18858c`.
- **Template** (`find templates -type f | sort | xargs shasum -a 256 | shasum -a 256`): `e8d5f1b5138620c9`.
- **Each task** (`find tasks/<task> -type f | sort | xargs shasum -a 256 | shasum -a 256`): in the table.

Recompute them before the run starts. A mismatch, or any later change to a task, the template, grading or analysis, goes under "Deviations".

| task | hash |
|---|---|
| better-auth-acme-sso | `89f2af2ec32b5c61` |
| better-auth-cancel-magic-link | `edebf48ee0c2a102` |
| better-auth-gateway-token-exchange | `eb80913d3bbd27ff` |
| better-auth-lean-sqlite-schema | `79fe6ed14f513021` |
| better-auth-long-password-login | `f65ba39a33467cc7` |
| better-auth-microsoft-any-tenant | `29d0d058488fd5ec` |
| better-auth-mobile-id-token | `6ce4fd264b89e9d7` |
| better-auth-proxy-reset-links | `b615d939143d87be` |
| better-auth-session-history | `49343364cea6f550` |
| better-auth-shared-rate-limit | `2897157430883d0a` |
| dotenv-applied-env-keys | `265d5dec925b0c8a` |
| dotenv-quiet-loader | `3cd376c0cbc19911` |
| eslint-upgrade-chart-registry | `1bd8a458b538b17e` |
| eslint-upgrade-job-runner | `e906f8c32cd7358a` |
| eslint-upgrade-model-mixins | `b1ef37646de910e6` |
| eslint-upgrade-rollout-weights | `cdf4f1531f11457d` |
| express-report-download-name | `5b45420466083b68` |
| firebase-chat-or-model | `da91572c43a74f32` |
| firebase-coupon-error-reason | `e89aa7a139ff29ce` |
| firebase-hybrid-cloud-model | `714396f7868b1fc7` |
| firebase-live-mic-audio | `52abd90512483193` |
| firebase-product-image | `d2855de22ff0640e` |
| firebase-team-member-role | `430ebe0f8d0e95cf` |
| firebase-template-request | `570d64e464f01499` |
| firebase-vertex-region | `753159d3c7edf68b` |
| jest-fixture-path-helper | `92b95c8b7e8d893d` |
| multer-file-count-upgrade | `34aeafd29f44e30b` |
| multer-parts-cap-upgrade | `f3275202db05b265` |
| next-account-page-build | `028ec31691c73e22` |
| next-bundle-tree-shaking | `fd5fd044568a2793` |
| next-og-share-card | `1117d7a9846e21aa` |
| next-upgrade-focus-config | `8bb22916f65a5642` |
| nextauth-tenant-redirect | `9b254bc6d02b8b8e` |
| nodemailer-relay-greet-pause | `692bcb86f83db93b` |
| nodemailer-relay-reconnect | `2be44985ef944ad1` |
| preact-activity-heatmap | `6db3bd192069392e` |
| preact-help-shortcut | `f67e927c8e95c969` |
| preact-tally-reset-all | `025ae9f632256b2a` |
| react-crawler-render | `e5a4968c41edfb16` |
| react-query-product-suspense | `df2c7c487981fa9d` |
| react-query-project-loader | `a4e5f9c5c1cd18cb` |
| react-router-download-links | `f66a9886dd1eb509` |
| rhf-quiz-correct-answer | `83f464ae6402710a` |
| rhf-submit-error-toast | `3b8e05e5c00298fa` |
| stripe-capability-badge | `c1d1d3370cdc5682` |
| stripe-card-decline | `3e82ffa6f93143c4` |
| stripe-card-only-checkout | `cc93c94bd676f68e` |
| stripe-order-state | `a5f1833093b16160` |
| stripe-webhook-replay | `3ecce1ec0510d577` |
| ts-upgrade-session-types | `3306deb4425b220a` |
| ts-upgrade-shipping-quotes | `2168d752557a7f69` |
| ts-upgrade-site-generator | `5220395bc60c4b25` |
| ts-upgrade-status-badges | `2eab7f2522840489` |
| vite-admin-page-build | `9a1af6abe143b102` |
| vitest-ci-attachments | `b793fd975700e671` |
| vitest-ci-test-settings | `2c767e6536a8ff92` |
| vitest-coverage-upgrade | `725bd5ebc6b86eee` |
| vitest-dom-project-platform | `e4563186e3fe2cdb` |
| vitest-full-case-titles | `48efc320325c312f` |
| vitest-kiosk-env-teardown | `be40a3a79259db3d` |
| vitest-list-test-names | `f95421a7e9197bf9` |
| vitest-module-cache-dir | `ea66763e1f99998d` |
| vitest-restock-flow-order | `9af7c4821f176bf8` |
| vitest-slug-case-names | `8f248ad4c9c18fe4` |
| zod-typed-queue-jobs | `e15a1da275bff2fd` |
| zod-widget-grid-pairs | `2c227cf3c32c4b44` |

## Deviations

1. **Harness change after the build freeze (not stalemap).** `freeze/v4-final` froze `src/`. After it, `bench/run.ts` gained two changes, both before any non-pilot session: each session's `node_modules` became its own folder of links to the shared install, so Vite and Vitest caches can't leak between sessions (the review's blocker 1); and session and notes work folders were put under a per-model folder, so two models can run at once. Neither changes what an arm gets or how a session is graded.
2. **One pilot session re-run.** The first attempt to run both models' pilots at once put two sessions in the same work folder, which stopped the `claude-sonnet-4-5` pilot. That pilot was resumed after the fix above. The one `claude-sonnet-5-5` pilot session that had shared the folder (`better-auth-cancel-magic-link`, `alone`, checks) was deleted and re-run. Pilot sessions aren't confirmatory data.
3. **Context7 keys.** The run used four Context7 API keys, rotated by the harness, with a fifth added to the key file during the run. The keys only matter to the exploratory Context7 arms.
