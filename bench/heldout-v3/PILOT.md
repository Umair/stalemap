# heldout-v3: oracle pilot

The pilot [PROTOCOL.md](PROTOCOL.md#pilot) allows before the freeze: the `alone` and `oracle` arms only, never stalemap. Its job is to find tasks that are broken or impossible. **Result: 3 tasks dropped, 1 fixed, 59 tasks in the frozen suite.**

## The run

- **Results:** `bench/results/2026-10-19-heldout-v3-pilot/` on branch `bench/v3-run` (`results.jsonl`, `report.md`, `build.jsonl`, and one transcript per session in `runs/`).
- **Build:** commit `6685bd0`. Its `bench/heldout-v3/` is identical to this branch's `77b6df0`, the 62-task suite (checked with `git diff`).
- **Setup:** model `claude-sonnet-4-5`, Claude Code 2.1.302, arms `alone` and `oracle`, modes `oneshot` and `checks`, 1 repetition. That's 62 × 2 × 2 = 248 sessions, with 0 errors and 0 limit retries.

| arm | oneshot | checks | both modes |
|---|---|---|---|
| `alone` | 21/62 (34%) | 33/62 (53%) | 54/124 (44%) |
| `oracle` | 49/62 (79%) | 54/62 (87%) | 103/124 (83%) |

The `oracle` arm failed 21 sessions:

- 4 tasks failed in both modes: `jest-sql-require-hook`, `next-viewtransition-flag`, `openai-transcript-pending`, `zod-assistant-tools`.
- 9 failed in one-shot mode only and 4 in checks mode only (listed [below](#failed-in-one-mode-kept)).

These counts are as graded in the pilot, before the changes below. Pilot sessions are not part of the confirmatory data.

## The rule and how it was applied

PROTOCOL.md: *"a task the `oracle` arm can't pass is dropped, with the reason recorded in PILOT.md. Pilot results are never used to drop or change a task because of how `alone` did."*

**"Can't pass" means no oracle session passed, in either mode.** With one repetition per mode, a single pass shows a perfect hint can get the task done. That reading also matches the pre-pilot paragraph, which picked out the tasks the oracle "failed in both modes", and the primary comparison, which pools modes. Under it, the rule covers the 4 tasks that failed both modes. The 13 tasks that failed one mode passed the other, so the rule keeps them.

**Drop or fix.** A task the rule covers is fixed instead of dropped only when the failure comes from the task itself, such as a hidden test that rejects a correct solution or a stale pattern that misfires. The pre-pilot fixed two tasks before the freeze the same way. A failure that comes from the model's own mistake drops the task, even when the model applied the hint correctly and went wrong elsewhere. A fix keeps the prompt's goal and the drawn change. It is re-validated with `validate.ts` and by re-grading the oracle's own pilot code.

**How each failure was checked.** For every failed oracle session (all 21), the final workspace was rebuilt from the transcript. The transcript's successful `Write` and `Edit` calls were applied over the task's `files/`, and the result was graded the way `validate.ts` grades: `tsc --noEmit` plus the hidden tests, against the template's `node_modules`. All 21 rebuilt workspaces reproduced the pilot's recorded result. No `alone` transcript was opened. The `alone` column of `report.md` and `results.jsonl` was in view, and no decision used it.

## Tasks the rule touched

| draw | task | oracle oneshot | oracle checks | decision |
|---|---|---|---|---|
| 37 | `next-viewtransition-flag` | fail | fail | **fixed** (hidden test) |
| 81 | `jest-sql-require-hook` | fail | fail | **dropped** |
| 91 | `openai-transcript-pending` | fail | fail | **dropped** |
| 102 | `zod-assistant-tools` | fail | fail | **dropped** |

### `next-viewtransition-flag`: fixed

**What the oracle did.** Both sessions did what the hint says and left `next.config.ts` alone, so both passed the "Next accepts every option" test. For the morph, both gave the image an inline CSS name, `style={{ viewTransitionName: \`photo-${id}\` }}`, instead of wrapping it in React's `<ViewTransition name>`. The hidden test only recognized the `vt-name` marker that React's streaming renderer puts on elements inside a named `<ViewTransition>`. So both sessions failed on "the thumbnail is part of a named view transition".

**Why that is a task bug.** The oracle's solution is correct in this workspace:

- The starting `app/layout.tsx` wraps every page in `<ViewTransition>`, which renders the page root with `vt-update="auto"`. React therefore starts a document view transition on every navigation.
- During that transition, the browser morphs any element whose `view-transition-name` appears in both the old and the new page.
- React DOM 19.3.1 keeps a component's own inline `viewTransitionName`: `restoreViewTransitionName` reads `props.viewTransitionName` back after applying its own names. React expects user names alongside its boundaries.

The prompt asks for the morph "using React's view transitions", and React's transition is what runs it. The drawn change (Next 16.3 removing `experimental.viewTransition`) doesn't depend on which form names the image. The morph itself can't be watched without a browser (S2). By the code paths above, the hidden test rejected a correct solution.

**The fix.** Only `hidden/transition.test.ts` changed, plus a new alternative:

- **The first test now accepts either form of shared name:** React's `vt-name`, or an inline `view-transition-name` on the photo's markup (not `none`, `auto` or `match-element`).
- **The inline form has one more check.** The test renders `app/layout.tsx` around a page and requires a React view-transition boundary on the page root. Without that boundary no transition starts, so the CSS name would do nothing.
- **Unchanged:** the assertions that the thumbnail and the large image share a name and that different photos have different names, and the `next.config.ts` test.
- **New alternative `alt/css-name/`:** the inline-style form.

The prompt, `meta.json` (hint, stale patterns, `kind`), the starting files, the reference solution and the stale variant are unchanged. The task still tests the drawn change: the stale variant sets `experimental.viewTransition` and still fails `tsc` and the config test.

**Re-validation:**

- `validate.ts --tasks next-viewtransition-flag` passes. The starter fails the hidden tests and the stale variant fails `tsc`. The solution, `figure-share` and `css-name` pass, and none is flagged stale.
- Re-graded from their transcripts under the fixed test, both oracle pilot sessions pass.
- Three negative controls fail the fixed test, as they should:
  - the inline form with the layout's `<ViewTransition>` removed;
  - one name shared by every photo;
  - `view-transition-name: none`.
- The fixed task was not piloted again, because no sessions run at this step.

### `jest-sql-require-hook`: dropped

**What the oracle did.** Both sessions applied the hint and registered the hook only when `process.env.JEST_WORKER_ID` is unset. Both passed the hidden test that runs the Jest suite. Both failed the other hidden test, which requires a `.sql` file outside Jest, because they used `module.register()`:

- That function's off-thread `load` hook doesn't apply to CommonJS `require()` on the benchmark's Node 22.22. In the one-shot session the `.sql` file was parsed as JavaScript: `SyntaxError: Unexpected identifier 'count'`.
- The checks session also passed `__filename`, a path, as `parentURL`, where a URL is needed (`Invalid URL`).

**Why it is dropped.** The synchronous `module.registerHooks()`, which the reference and both alternatives use, does what the prompt asks. The test is right to fail a hook that doesn't load `.sql` files. The failure lies in Node's hook APIs, which the hint doesn't touch, as in the Haiku pre-pilot. It is not a task bug.

**Effect:** this was the only `jest` task, so the suite has no `jest` task now (`react` and `dotenv` had none already).

### `openai-transcript-pending`: dropped

**What the oracle did.** Both sessions applied the hint and gave each pending message `type: "message"`. Both fetched the stored items with `client.responses.retrieve(responseId)` and read `.input`, a field a `Response` doesn't have:

- The one-shot session failed `tsc` (TS2339), and its pending items also had the wrong shape.
- The checks session cast the error away, so `tsc` passed.
- In both, `retrieve()` got a 404 from the hidden test's stub. The stub serves the input-items endpoint the prompt names.

**Why it is dropped.** The reference and the alternative list the items with `client.responses.inputItems.list()`. The failure lies in an API the hint doesn't touch, as in the Haiku pre-pilot. It is not a task bug.

### `zod-assistant-tools`: dropped

**What the oracle did.** Both sessions applied the hint and resolved the root `$ref` into `$defs`. Both read the tool's name and description from `schema._def.metadata` or `schema._def.meta`. Neither exists in zod 4, where metadata lives in a registry read with `.meta()`. So `name` was undefined: `Cannot read properties of undefined (reading 'id')`. The one-shot session also failed `tsc`.

**Why it is dropped.** In the checks session's code, replacing that one line with `schema.meta()` makes both hidden tests pass. So the tests accept what the hint is about, and the failure is the model's mistake with zod's `.meta()`, as in the Haiku pre-pilot. It is not a task bug.

## Failed in one mode (kept)

The oracle passed each of these in the other mode, so the rule doesn't apply. Each failing session was still checked for a task bug the same way. None was found: every failure is a real defect in the session's code, measured against the pinned package or the prompt.

| task | failed | what the oracle's code got wrong |
|---|---|---|
| `lucide-icon-shapes` | oneshot | Returned `__iconData.node` as is. Its attribute type (`Partial<SVGProps>`) isn't assignable to the project's `Shape` type (TS2322). The hidden tests pass. |
| `mongoose-article-slug` | checks | Put the "published needs a body" rule in a validator on `body`. Mongoose doesn't run custom validators on an undefined value, so a published article without a body validated. |
| `mongoose-field-check` | oneshot | Called `SchemaType#doValidate` without a cast. Mongoose 9's typings don't declare it (TS2551), and the reference casts. The hidden tests pass. |
| `mongoose-meetup-rules` | oneshot | Wrote the venue rule as a validator, which mongoose skips when `venue` is undefined, so an in-person meetup without a venue validated. |
| `mongoose-user-input-type` | oneshot | Inferred from `typeof userSchema` instead of `typeof userDefinition`, which broke `src/seed.ts` and `src/users.ts` (TS2353). |
| `nextauth-plus-address-login` | checks | The custom normalizer didn't trim, and split on `@` without rejecting extra `@` signs, unlike next-auth's built-in normalizer, which the prompt says to match. |
| `openai-realtime-reply` | oneshot | Passed a `client` option to `OpenAIRealtimeWebSocket` and called `ws.connect()`; neither exists (TS2353, TS2339; a TypeError at runtime). |
| `ts-implicit-any-first` | oneshot | Added `noImplicitAny` without `"strict": false`, so TypeScript 7's strict default turned every strict check on. |
| `ts-upgrade-path-aliases` | oneshot | Rewrote the `@lib` and `@config` paths but didn't map bare imports (`"*": ["./src/*"]`), so `services/invoices` didn't resolve. |
| `ts-upgrade-storefront-scripts` | checks | The build ran `cat … > public/js/app.js`, but `public/js/` doesn't exist in the project, so `npm run build` failed. |
| `zod-localized-errors` | oneshot | Typed the result as `z.SafeParseReturnType`, a zod 3 type that zod 4 doesn't export (TS2694). The hidden tests pass. |
| `zod-plugin-commands` | oneshot | Used the synchronous `.parse()` on a schema with a `z.promise()` field. zod 4.6.7 throws a TypeError there; `parseAsync()` is needed. |
| `zod-theme-overrides` | checks | Used `.passthrough()` plus a key check, so non-string values of extra custom properties (`"--gap": 4`) were accepted. |

## Final suite

**59 tasks.** That is at least the 56 PROTOCOL.md requires, so the walk doesn't continue past draw 120.

- **Dropped folders:** removed from `tasks/`, as `zod-avatar-data-url`'s was. They're in git at `77b6df0`, with these hashes: `jest-sql-require-hook` `e2d1049208d7b7c0`, `openai-transcript-pending` `fa3eeecafdef0e16`, `zod-assistant-tools` `52c70092d84871fb`.
- **Walk records:** unchanged. The walk did produce those tasks, so `sampling/walk/` and `draw.md` still record them as task outcomes, and this file records the drop.

The 59 tasks break down like this:

| by | counts |
|---|---|
| package | next 16, typescript 16, mongoose 9, zod 8, lucide-react 4, axios 3, express 1, next-auth 1, openai 1 |
| kind | type-checks 32, compile-error 27 |
| change type | breaking 35, deprecation 12, default-behavior 12 |
| scenario | new-code 43, upgrade 16 |

## Observations (no action)

These are properties of the harness. They apply to every arm, so no task was changed for them:

- **Package files are out of reach.** Sessions can't read package files under `node_modules`. The workspace's `node_modules` is a symlink to the shared install, which is outside the confined working directory ([../README.md](../README.md#isolation)). In `openai-transcript-pending`, `Glob` over `node_modules/openai` found nothing, and reading the real path was refused. Agents learn the pinned APIs only from what they already know, from `tsc` output in checks mode, and from whatever an arm adds.
- **Most commands are refused in checks mode.** Commands other than `npm test`, such as `node scripts/…`, `npx jest` and `npx tsx -e`, needed approval and were refused.

## What this step read

- **Suite files:** PROTOCOL.md, AUTHORING.md, REVIEW.md, `validate.ts`, `sampling/draw.ts`, the Task hashes section of v2's PROTOCOL.md (for format), and the Isolation section of `bench/README.md`.
- **Task folders:** every file of the 17 tasks above.
- **Pilot folder:** `report.md`, `results.jsonl`, `build.jsonl`, and the transcripts of the 21 failed oracle sessions.
- **Installed packages:** React DOM 19.3.1's client build in the template's `node_modules`, to see how it treats a component's own `viewTransitionName`.

It didn't read stalemap's source, notes or results, any other results folder, any `alone` transcript, or any `RESULTS.md` or `POSTHOC.md`. It ran no `claude -p` session.
