# heldout-v4: oracle pilot

The pilot [PROTOCOL.md](PROTOCOL.md#pilot) allows before the freeze: the `alone` and `oracle` arms only, never stalemap. Its job is to find tasks that are broken or impossible. **Result: no task dropped, 1 task fixed, 66 tasks in the frozen suite.**

## The run

- **Results:** two folders in the `bench/v4-run` worktree (left uncommitted by this step), each with `results.jsonl`, `report.md`, `build.jsonl` and one transcript per session in `runs/`:
  - `bench/results/2026-10-20-heldout-v4-pilot-claude-sonnet-5-5/` (primary model);
  - `bench/results/2026-10-20-heldout-v4-pilot-claude-sonnet-4-5/` (secondary model).
- **Build:** commit `73035ec`, with Claude Code 2.1.302 and the template hash `1cc96ba88aaed081` recorded in `build.jsonl`. Its `bench/heldout-v4/` is identical to `3ff578d`, the reviewed 66-task suite on `bench/heldout-v4` (checked with `git diff`).
- **Setup:** arms `alone` and `oracle`, modes `oneshot` and `checks`, 1 repetition, both models. That's 66 × 2 × 2 = 264 sessions per model, with 0 errors and 0 limit retries in the oracle arm.

`oracle` arm, as graded in the pilot, before the change below:

| model | oneshot | checks | both modes |
|---|---|---|---|
| `claude-sonnet-5-5` (primary) | 62/66 (94%) | 65/66 (98%) | 127/132 (96%) |
| `claude-sonnet-4-5` | 45/66 (68%) | 57/66 (86%) | 102/132 (77%) |

On the primary model, the oracle failed 5 sessions:

- 1 task failed in both modes: `ts-upgrade-shipping-quotes`.
- 3 tasks failed in one-shot mode only (listed [below](#failed-in-one-mode-kept)).

This step used only the oracle rows. The `alone` results are not given here, and no decision used them. Pilot sessions are not part of the confirmatory data.

## The rule and how it was applied

PROTOCOL.md: *"A task the oracle fails in every primary-model (`claude-sonnet-5-5`) pilot session is dropped, as in v3, and so is a task that turns out to be broken (…); a broken task may be fixed instead of dropped when the fix keeps the prompt's goal and the drawn change."*

- **The rule covers** a task the oracle failed in both modes on `claude-sonnet-5-5`, read the way v3's PILOT.md reads it. One pass shows a perfect hint can get the task done. Only `ts-upgrade-shipping-quotes` meets that.
- **Drop or fix.** As in v3, a task the rule covers is fixed instead of dropped only when the failure comes from the task itself, such as a hidden test that rejects a correct solution or a stale pattern that misfires. A failure that comes from the model's own mistake drops the task. A fix keeps the prompt's goal and the drawn change. It is re-validated with `validate.ts` and by re-grading the oracle's own pilot code.
- **How each failure was checked.** For every failed oracle session, the final workspace was rebuilt from the transcript: 5 on the primary model, 30 on `claude-sonnet-4-5`. The transcript's successful `Write`, `Edit` and `MultiEdit` calls were applied over the task's `files/`. Writes outside the workspace, such as an agent's scratchpad, were skipped. The result was graded the way `validate.ts` grades: `tsc --noEmit` plus the hidden tests, against the template's packages, through a per-workspace `node_modules` folder of symlinks. All 35 rebuilt workspaces reproduced the pilot's recorded failure.
- **The secondary model.** Its 30 failures were checked only for broken tasks, since the drop rule is the primary model's. They found none other than the one below; every other failure is a defect in the session's code.

## Tasks the rule touched

| draw | task | oracle oneshot | oracle checks | decision |
|---|---|---|---|---|
| 86 | `ts-upgrade-shipping-quotes` | fail | fail | **fixed** (hidden test) |

### `ts-upgrade-shipping-quotes`: fixed

**What the oracle did.** Both primary-model sessions followed the hint.
- They rewrote the Closure JSDoc in `src/legacy/shipping.js`:
  - `@enum` became a typedef plus a typed const;
  - `function(Quote): boolean=` became `(quote: Quote) => boolean` marked optional;
  - `?Quote` became `Quote | null`;
  - `/** @typedef {T} */ var Quote;` became `@typedef {T} Quote`;
  - `{?}` became `{any}`, as the hint says ("the bare ? type → any").
- `src/checkout.ts` type-checked and every hidden assertion passed.
- The run failed only on `tsc`, at a line inside the hidden test: `test/hidden/shipping.test.ts(26,16): error TS2554: Expected 2 arguments, but got 1.` That line called `describe(quotes[2])` with no `options`.

**Why that is a task bug.** The prompt asks to fix the module "with the module's types intact". In the starting file, `describe`'s second parameter is `@param {?} options`, which is required. Checked: on TypeScript 6.0.3, the version the project upgraded from, the untouched starter fails the same hidden line with the same TS2554. So the hidden test demanded an optional `options`, which the original types never had. The reference and the alternative happen to write `[options]`. A rewrite that keeps the module's types exactly, `{any} options` as the hint itself suggests, was rejected. The drawn change (TypeScript 7 dropping Closure JSDoc in `.js` files) has nothing to do with whether that parameter is optional.

`claude-sonnet-4-5`'s oracle sessions hit the same line (in one-shot mode, line 26 alone). In checks mode they also hit line 24, `cheapest(quotes)`, because they made `accept` required. That second error is the session's own mistake: the original `function(Quote): boolean=` is optional, so line 24 is right to call it with one argument.

**The fix.** Only `hidden/shipping.test.ts` changed, plus a new alternative:
- The call on line 26 is now `describe(quotes[2], undefined)`, with a comment. That compiles whether `options` is required or optional, and it still checks the documented USD default.
- **New alternative `alt/required-options/`:** the reference solution with `@param {any} options` (required, the original arity).

The prompt, `meta.json` (hint, stale patterns, `kind`), the starting files, the reference solution, the stale variant and the other hidden assertions are unchanged. The `IsAny` type checks still require real types from the module.

**Re-validation:**
- `validate.ts --tasks ts-upgrade-shipping-quotes` passes. The starter and the stale variant fail `tsc`. The solution, `inline-types` and `required-options` pass, and none is flagged stale.
- Re-graded from their transcripts under the fixed test, both primary-model oracle sessions pass (`tsc` and hidden tests).
- The fixed task was not piloted again, because no sessions run at this step.

## Failed in one mode (kept)

The oracle passed each of these in checks mode, so the rule doesn't apply. Each failing session was still checked for a task bug the same way. None was found: every failure is a real defect in the session's code, measured against the pinned package or the prompt.

| draw | task | failed | what the oracle's code got wrong |
|---|---|---|---|
| 83 | `better-auth-mobile-id-token` | oneshot | Applied the hint's `idToken` config but passed `jwks` as a URL string, where better-auth 1.7.11 takes a key-set function such as jose's `createRemoteJWKSet(url)` (TS2345). At runtime the genuine token was rejected with 401. |
| 141 | `rhf-submit-error-toast` | oneshot | Wrapped `handleSubmit` with `return await submit(event)` inside a new async function. The result was inferred as `Promise<TResult \| undefined>`, which isn't assignable to `UseFormHandleSubmit`'s `Promise<Awaited<TResult> \| undefined>` (TS2322). The hidden tests pass; the task is `compile-error`, and the reference types it correctly. |
| 157 | `react-query-product-suspense` | oneshot | Switched `ProductDetails` to `useSuspenseQuery` but left `experimental_prefetchInRender: true` in `src/queryClient.ts`, the option the hint says was removed (TS2353, flagged stale). The hidden tests pass. |

## Final suite

**66 tasks**, at least the 56 PROTOCOL.md requires. No task was dropped, so the walk doesn't continue past draw 170, and `sampling/walk/` and `draw.md` are unchanged. The breakdown is PROTOCOL.md's ([Tasks in the walk](PROTOCOL.md#tasks-in-the-walk)):

| by | counts |
|---|---|
| package | better-auth 10, vitest 10, firebase 8, stripe 5, next 4, typescript 4, eslint 4, preact 3, zod 2, dotenv 2, multer 2, nodemailer 2, react-hook-form 2, @tanstack/react-query 2, react 1, react-router 1, next-auth 1, express 1, vite 1, jest 1 |
| kind | type-checks 42, compile-error 24 |
| change type | breaking 34, default-behavior 25, deprecation 7 |
| scenario | new-code 51, upgrade 15 |

## What this step read

- **Suite files:** v3's PILOT.md and Freeze section (for method and format); this suite's PROTOCOL.md, `validate.ts`, and every file of the 4 tasks above.
- **Pilot folders:** `build.jsonl`, the oracle rows of `results.jsonl`, and the transcripts of the 35 failed oracle sessions. Incidentally, the first raw line of `results.jsonl` (an `alone` row) and the progress lines of the secondary model's pilot log passed through the reviewer's view while checking that the run had finished. No decision used them.
- **Installed packages:** TypeScript 6.0.3 (from `bench/.work/old/` in the `bench/heldout-v4` worktree), to grade the starter's types on the version the project upgraded from; better-auth 1.7.11's `OAuthIdTokenConfig` type.

It didn't read stalemap's source, notes or results, any other results folder, any `alone` transcript, `report.md`, or any `RESULTS.md` or `POSTHOC.md`. It ran no `claude -p` session. Scratch workspaces are in `bench/.work/pilot-v4/`.
