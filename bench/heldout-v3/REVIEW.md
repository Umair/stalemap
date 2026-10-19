# heldout-v3: independent review before the pilot

An independent check of the 63 built tasks and 57 recorded skips for draws 1–120, done before the oracle pilot and the freeze, as v2 had. It doesn't change the draw, the population or the skip criteria.

**Verdict:** the suite is in good shape. Every skip is justified under its criterion, and 61 of the 63 tasks test the drawn change cleanly, with a plausible stale variant and hidden tests that grade outcomes. Five small fixes were applied to stale variants and stale patterns (none touch a prompt, a hidden test or a solution, so no grading outcome changes). Two tasks need a decision before the freeze: `zod-avatar-data-url` should probably become an S6 skip, and `next-viewtransition-flag` mixes in a second change. `validate.ts` passes on all 63 tasks after the fixes.

## How it was reviewed

- **Blindness.** The reviewer didn't run stalemap or any `claude -p` session, and didn't read `bench/results/**` (including the untracked pre-pilot results folder in this worktree), any `stalemap-notes*.md`, `src/render.ts`, `src/guard.ts`, `src/typediff.ts`, `src/changelog.ts`, `src/editnotes.ts`, `src/changes.ts`, any `RESULTS.md` or `POSTHOC.md`, the posthoc worktree, the side-session notes folders or the project memory topic files.
- **Read:** PROTOCOL.md, AUTHORING.md, validate.ts, draw.md, every walk outcome, and every task's `task.md`, `meta.json`, `files/`, `stale/`, `solution/`, `alt/` and `hidden/`, as of commit `2056259`.
- **Skips:** each reason was checked against its criterion; the ones that turn on package behavior were spot-checked against the installed packages (lucide aliases, Next 15.3.4's `legacyBehavior`, express `res.send()` Content-Type handling on 5.1.0 vs 5.3.0, mongoose's subdocument `deleteOne()` hook path in 8.16.1 vs 9.11.2).
- **Tasks: a check validate.ts doesn't do.** Each stale variant was graded (`tsc --noEmit` and the hidden tests) against the pre-cutoff version of its package from `bench/.work/old/` (axios 1.10.0, express 5.1.0, jest 30.0.3, lucide-react 0.525.0, mongoose 8.16.1, next 15.3.4, next-auth 4.24.11, openai 5.8.2, typescript 5.8.3, zod 4.0.14), overlaid on the template's `node_modules`. A stale variant that passes there fails on the pinned version *because of the change*. 46 of 63 passed outright; every other result is explained in [Stale variants on the old versions](#stale-variants-on-the-old-versions). The harness was a scratch script; its workspaces are in `bench/.work/review-old/`. For the two zod findings, zod 4.1.13 and 4.5.4 were also installed in scratch folders under `bench/.work/old/`.

## Fixes applied

All five touch only a stale variant or a stale pattern, which feed validate.ts and the secondary stale-API metric. Each was re-validated (`validate.ts --tasks ...`), and the three stale-variant fixes were re-run on TypeScript 5.8.3, where they now pass.

| task | file | change | why |
|---|---|---|---|
| `ts-upgrade-path-aliases` | `stale/tsconfig.json` | `"ignoreDeprecations": "6.0"` → `"5.0"` | A model with mid-2025 knowledge knows the `"5.0"` escape hatch, not `"6.0"`, and TS 7's error for `baseUrl` doesn't mention `ignoreDeprecations`. With `"6.0"` the stale config was also invalid on 5.8 (TS5103). The six other upgrade stale variants that add the option already use `"5.0"`. |
| `ts-upgrade-slug-library` | `stale/tsconfig.json` | same | same |
| `ts-check-doc-examples` | `stale/src/check-examples.ts` | `tsc --strict --noEmit file` → `tsc --strict --noEmit --skipLibCheck file` | Without a config, TS 5.8's defaults (node10 resolution, no `esModuleInterop`, every `@types` package loaded) make the declarations of zod and of parse5 (pulled in by `@types/jsdom`) fail, so the old stale command never reported a clean example as ok on 5.8 either. With `--skipLibCheck` it works on 5.8 and still fails on 7.0 only with TS5112, the drawn change. |
| `mongoose-meetup-rules` | `meta.json` `stale[1]` | `(?:default\|required)\s*:\s*function\(\)` → `default\s*:\s*function\(\)` | On 9.11.2 an unannotated `required: function () { return !this.online; }` compiles (only the unannotated `default` function and the validator fail), so the pattern flagged correct code as stale. |
| `zod-upgrade-country-guard` | `meta.json` `stale[0]` | also exempt `shopCountry as ...` | `country: shopCountry as Address["country"]` type-checks and passes the hidden tests (checked), but was flagged stale. (Wrapping the predicate as `(c) => isCountryCode(c)` is *not* a fix: TypeScript infers the type predicate, so it still narrows. Checked.) |

## Needs a decision

**Applied on 2026-10-18 at the owner's request:** both recommendations below. `zod-avatar-data-url` is now an S6 skip (its task folder was removed; the outcome is in `sampling/walk/zod-nad-2.jsonl`), and `next-viewtransition-flag`'s starting layout has a stable `ViewTransition` cross-fade imported from `react`, so its stale variant imports `ViewTransition` too and fails only on `experimental.viewTransition` (`tsc` and the config test); its stale patterns and oracle hint dropped `unstable_ViewTransition`. The suite now has 62 tasks.

**1. `zod-avatar-data-url` (draw 61): recommend changing the outcome to an S6 skip.** The task rests on composing `z.base64()` into `z.templateLiteral()`. Before 4.6 that composition was unusable: in 4.0.14, 4.1.13 and 4.5.4 it compiles to `/^data:image\/(png|jpeg|webp);base64,$|^(?:[0-9a-zA-Z+/]{4})*…$/`, whose stray `$|^` makes it reject every data URL, complete or not (checked on all three). 4.6 made it check only the alphabet, so it now accepts truncated payloads. The stale variant therefore fails on every version, for opposite reasons, and code written before the cutoff could never have relied on the old behavior. That is the situation the walk recorded as S6 for axios `url-credentials-decoded` (#113) and `no-proxy-cidr` (#120): "code written for 1.10 could not use them". For consistency, the outcome should read something like: *S6: before 4.6, z.base64() inside z.templateLiteral() compiled to a pattern that rejected every input (checked on 4.0.14, 4.1.13 and 4.5.4), so no working pre-cutoff code used it; tried a data-URL avatar field, whose correct 4.0 form (checking the payload with z.base64() on its own) works unchanged on 4.6.7.* The email half of the same entry doesn't rescue it: `z.templateLiteral(["mailto:", z.email()])` gave the same results on 4.0.14, 4.1.13, 4.5.4 and 4.6.7 for valid and malformed addresses. The suite would then have 62 tasks; PROTOCOL.md now takes every task that passes the oracle pilot, at least 56.

Keep the other zod task whose stale was already wrong before the change, `zod-group-booking` (draw 24). On 4.0.14 `.extend()` on a refined object ran but silently dropped the refinement; from 4.1 it throws and `.safeExtend()` exists (checked on 4.1.13). Plausible code was usable before and now fails loudly, so the change does affect it, unlike the avatar case.

**2. `next-viewtransition-flag` (draw 37): two changes in one stale variant.** The drawn change is Next 16.3 removing `experimental.viewTransition`. The stale variant also imports `unstable_ViewTransition` from `react`, which neither React 19.3.1 nor the React canary that Next 16.4.2 vendors exports (both export `ViewTransition`). That rename isn't in the population: `unstable_ViewTransition` was never in a stable React release. So the stale fails `tsc` and the first hidden test for the React reason alone, and only the config test for the drawn change. A model that knows Next's flag is gone but writes `unstable_ViewTransition` fails; so does one that knows React's export but sets the flag.

- *Keep* (defensible): from a Next developer's side both happened together ("view transitions work without a flag"), and the oracle hint names both.
- *Isolate the drawn change* (cleaner): give the starting files an existing stable `ViewTransition` use (for example a page cross-fade in `app/layout.tsx`, imported from `react`), so the only open question is the config flag. The stale variant then imports `ViewTransition` and adds `experimental.viewTransition: true`, which still fails `tsc` (excess property on `NextConfig`) and the config test.

Recommended: isolate, before the freeze.

## Tasks

Draw order. "Old" is the stale variant graded on the pre-cutoff version (see [Stale variants on the old versions](#stale-variants-on-the-old-versions) for every result that isn't a plain pass).

| # | task | verdict | notes |
|---|---|---|---|
| 1 | zod-localized-errors | keep | `z.config()` around `safeParse` is the documented 4.0 pattern; errors now build lazily after the locale is reset. Old: pass. |
| 4 | lucide-swiss-franc | keep | Deprecation task, signalled by TS 6 suggestion diagnostics. The hidden test also rejects the `SwissFranc` objects by identity, which on 1.57 every non-deprecated solution meets. |
| 5 | mongoose-field-check | keep | Callback `doValidate()` is the 8.x idiom; alt via a bare `Document` covers another route. Old: pass. |
| 6 | zod-body-validation | keep | Old: pass. |
| 8 | axios-fetch-length-limits | keep | Stale = untouched upgrade code. Old: pass. |
| 12 | mongoose-change-events | keep | `doc.id` on `Document`. Old: pass. |
| 14 | mongoose-article-slug | keep | Old: pass. |
| 15 | ts-nav-label-length | keep | Good task: the runtime check must match TS 7's code-point inference. Old: pass. |
| 17 | ts-implicit-any-first | keep | The probe covers every strict flag, so explicit-flag solutions pass. Old: pass. |
| 18 | ts-upgrade-build-config | keep | Byte-exact emit comparison is what the prompt asks for. Old: pass. |
| 21 | mongoose-failed-logins | keep | Old: pass. |
| 23 | zod-signup-strict-form | keep | Old: pass. |
| 24 | zod-group-booking | keep, note | On 4.0.14 `.extend()` on a refined object silently dropped the refinement, so the stale already failed the "keeps the check-out rule" test there; 4.1 turned that into a throw and added `.safeExtend()`. The task partly measures a pre-cutoff pitfall that the change made loud (see [Needs a decision](#needs-a-decision)). |
| 25 | zod-partner-event-times | keep | Old: pass. |
| 26 | next-experimental-turbo | keep | Old: pass. The hidden test would also accept a browser-only conditional alias (lenient, harmless). |
| 28 | zod-plugin-commands | keep, note | Type-only change: `parseAsync` of `z.promise()` returns the resolved value at runtime in both 4.0.14 and 4.6.7, but 4.6.7 types it as `Promise<…>`. The stale is runtime-correct and fails only `tsc`, which is what `compile-error` means. Old: pass. |
| 29 | next-image-max-redirects | keep | Old: pass. |
| 31 | lucide-icon-shapes | keep | 0.525's icon modules export `__iconNode` and its `DynamicIcon` reads it, so the stale is plausible. Old: not runnable (see below). |
| 35 | next-experimental-ppr | keep, note | `experimental.ppr` was canary-only on stable 15.3.4 (`CanaryOnlyError`), so the stale never worked on stable 15; it is still what pre-cutoff docs taught. Checking `config.cacheComponents` is fine: in 16 it is the only switch. |
| 37 | next-viewtransition-flag | **fix (recommended)** | See [Needs a decision](#needs-a-decision). |
| 38 | next-root-params | keep | Harness-heavy (below). `unstable_rootParams` shipped unflagged in 15.3.4; the stale passes there once the 16-only loader step is skipped. |
| 40 | next-custom-server-render | keep | Harness-heavy (below). Old: pass. |
| 41 | next-config-custom-key | keep | Old: pass. |
| 42 | mongoose-user-input-type | keep | Old: pass. |
| 44 | mongoose-orders-by-id-time | keep | Old: pass (bson 6's random tail doesn't matter at the tested boundaries). |
| 46 | ts-check-doc-examples | fixed | See [Fixes applied](#fixes-applied). |
| 48 | ts-upgrade-browser-app | keep | Old: pass. |
| 50 | ts-library-build-output | keep | Natural task. Old: pass. |
| 51 | ts-commonjs-build | keep | The stale `moduleResolution: "node"` is exactly what 5.8 required for `module: commonjs`. Old: pass. |
| 52 | axios-upload-too-large | keep | Old: pass. |
| 53 | ts-upgrade-express-api | keep | Old: pass. |
| 56 | mongoose-product-search | keep | The hidden test imports `sift`, mongoose's own dependency, hoisted in the template (fine while the template is pinned). Old: pass. |
| 58 | zod-upgrade-country-guard | fixed | Stale pattern only. Old: pass. |
| 59 | next-turbopack-build-cache | keep, note | `experimental.turbopackPersistentCaching` was canary-only on stable 15.3.4, like `ppr`. 16.4.2 defaults both file-system caches to on, so the prompt describes a real 16 situation. |
| 61 | zod-avatar-data-url | **change outcome** | Recommend S6: the composition the task rests on rejected every input in 4.0.14, 4.1.13 and 4.5.4. See [Needs a decision](#needs-a-decision). |
| 63 | ts-upgrade-slug-library | fixed | See [Fixes applied](#fixes-applied). |
| 66 | express-body-limit-upgrade | keep | body-parser 2.2.0 accepts `limit: NaN` (no cap); 2.3.0 throws. Note: express 5.1.0's `^2.2.0` range now installs 2.3.0, so a fresh 5.1 install already behaves like 5.3. Irrelevant here, the template pins 5.3.0. |
| 67 | next-image-local-ip | keep | Old: pass. |
| 68 | next-metadata-route-args | keep | Harness runs Next's metadata-route loader. Stale passes on 15.3.4 with `NODE_ENV=production`. |
| 70 | ts-upgrade-path-aliases | fixed | See [Fixes applied](#fixes-applied). |
| 71 | openai-realtime-reply | keep | Harness-heavy (below). Old: pass. |
| 72 | ts-upgrade-json-imports | keep | Old: pass. |
| 75 | mongoose-supplier-import | keep | `new Model(doc, fields, skipId)` is in the 8.x API docs. Old: pass. |
| 77 | next-amp-removed | keep | Harness-heavy (below). Upgrade task where the stale is "leave AMP in"; likely easy in checks mode (tsc names `next/amp`). Old: pass. |
| 80 | next-image-quality | keep | Tests 16's coercion to `qualities` as well as the 15.5 warning; the oracle covers both. Old: pass. |
| 81 | jest-sql-require-hook | keep | Spawns node and Jest; well inside 60 s. Old: pass. |
| 82 | next-middleware-proxy | keep | Harness-heavy (below). Fails the stale by the file convention `next build` warns about, which is Next's deprecation signal. |
| 83 | nextauth-plus-address-login | keep | The hidden test encodes 4.24.15's built-in normalizer, so the stale (4.24.11's default plus `+tag` removal) failing on 4.24.11 is by design. Natural: next-auth's docs show the default normalizer for copying. |
| 84 | ts-upgrade-legacy-helpers | keep | Old: pass. |
| 85 | mongoose-meetup-rules | fixed | Stale pattern only. Old: pass. |
| 86 | zod-theme-overrides | keep | Old: pass. |
| 88 | lucide-crisp-strokes | keep | Old: hidden pass (the tsc failure is an overlay artifact). |
| 90 | next-legacy-image | keep, note | The "served through the image optimizer" assertion also fails `next/legacy/image`'s lazy placeholder `<img>` on both 15 and 16. Harmless: the deprecation assertion fails it first, and no correct 16 solution uses legacy image. The prompt points straight at the image components, so expect this one to be easy. |
| 91 | openai-transcript-pending | keep, note | The hidden test asserts `type === "message"` at runtime, so the stale (no `type`) fails on 5.8.2 too; the change made TypeScript enforce what such an item always was. |
| 93 | next-cachelife-cachetag | keep | 16.4.2's `unstable_cacheLife`/`unstable_cacheTag` work but `console.error` a stabilization notice, which the test catches. Starting files are 16-era, so not runnable on 15. |
| 99 | ts-service-worker-types | keep | `no-default-lib` plus `reference lib="webworker"` is the classic pattern. Old: pass. |
| 100 | ts-upgrade-checkout-widget | keep | Old: pass. |
| 102 | zod-assistant-tools | keep | Old: pass. |
| 104 | ts-upgrade-storefront-scripts | keep | Hidden test runs `npm run build`; the alt uses the `esbuild` binary hoisted from `tsx`. Old: pass. |
| 105 | next-unrecognized-action | keep | Next 15.3.4 answered an unknown action with a not-found render (404), so the stale's 404 check was right before. The harness drives Next's own `handleAction`. |
| 107 | ts-upgrade-parcel-tracking | keep | Old: pass. |
| 111 | lucide-uploaded-icons | keep | Old: pass. |
| 112 | axios-download-redirects | keep | Old: pass. |

PROTOCOL.md was amended during this review (commit `2056259`): the suite is now every task that passes the oracle pilot, not the first 56 in draw order, so all 63 rows matter. The same commit changed `lucide-icon-shapes`' hint and `mongoose-failed-logins`' prompt and hidden test after the Haiku pre-pilot; the rows above reflect those versions, and both changes are sound.

### Prompts, stale variants and oracle hints

- No prompt names the new API or the change (validate.ts's `newApi` check passes, and reading them found nothing it misses). Four prompts say "We keep this codebase free of deprecated APIs" (`lucide-crisp-strokes`, `lucide-swiss-franc`, `lucide-uploaded-icons`, `next-legacy-image`). That's needed: their hidden tests fail deprecated usage, so the requirement has to be stated.
- Every stale variant is something a model with mid-2025 knowledge would plausibly write. The weakest are the upgrade tasks whose stale is "change nothing relevant" (`next-amp-removed`, `next-legacy-image`, most of the ten `ts-upgrade-*` tasks, whose stale adds `"ignoreDeprecations": "5.0"`); that is the honest stale for an upgrade nobody told the model about.
- Every oracle hint matches what the hidden tests and the installed package do.

### Harness-heavy hidden tests

All run against Next 16.4.2 internals or a hand-built server, so they are tied to the pinned versions; each passes the reference and at least one structurally different alternative.

| task | what the harness does | risk to a correct solution |
|---|---|---|
| next-root-params | Generates `next/root-params` with Next's loader, registers a resolve hook, renders inside Next's async-local-storage request scope. | Low. `next/root-params` is the only built-in way in 16; a `headers()` or `React.cache` workaround would fail, but those need other files and aren't reliable in Next. |
| next-custom-server-render | Replaces `app.init` with a recording request handler (no build), then runs the agent's handler on a real server. | Low. Rewriting the parsed URL or `req.url` both pass; a `next.config` rewrite can't depend on the handler option anyway. |
| next-middleware-proxy | Finds the interceptor file with Next's constants, loads swc bindings, reads matchers with `getPageStaticInfo`. | Low. Needs `@next/swc` (installed). Default export, `proxy` export and object matchers all pass. |
| next-amp-removed | ESM loader hook for `next/*` CommonJS defaults, `loadConfig`, both image-config contexts, renders the page. | Low. `<img>` and `next/image` both pass. |
| next-legacy-image | Same setup as `next-amp-removed`, plus console and `emitWarning` capture. | Low (see the note on the optimizer assertion above). |
| openai-realtime-reply | Hand-rolled `wss://` server with a self-signed certificate, speaking both the beta and GA realtime protocols. | Low. Validated with the beta and GA clients; events are 5 ms apart, which leaves time to attach listeners. |
| also heavy: next-cachelife-cachetag, next-metadata-route-args, next-unrecognized-action, next-image-quality | Emulate `"use cache"` scope, run the metadata-route loader with a fake webpack context, call `handleAction` with stub stores, render with image config. | Low; each uses Next's own code for the decision being graded. |

### Stale variants on the old versions

46 of 63 stale variants pass `tsc` and the hidden tests on the pre-cutoff version, after the three fixes above (which turned `ts-check-doc-examples`, `ts-upgrade-path-aliases` and `ts-upgrade-slug-library` into passes). The other 17:

| task | old result | explanation |
|---|---|---|
| express-body-limit-upgrade | hidden fail | Artifact: the scratch install of express 5.1.0 resolved body-parser 2.3.0. body-parser 2.2.0 accepts `limit: NaN`, confirmed directly. |
| lucide-crisp-strokes | tsc fail | Artifact: 0.525's types resolve `@types/react` outside the template. Hidden tests pass. |
| lucide-icon-shapes | tsc and hidden fail | Artifact: 0.525's `dynamic.mjs` doesn't load under plain Node ESM. Its icon modules do export `__iconNode`. |
| lucide-swiss-franc | hidden fail | By design: the test rejects `SwissFranc` by identity. |
| next-cachelife-cachetag | tsc and hidden fail | Starting files use 16 APIs (`revalidateTag(tag, profile)`, `cacheComponents`). |
| next-experimental-ppr, next-turbopack-build-cache | hidden fail | The stale keys were canary-only on stable 15.3.4 (see the task notes). |
| next-legacy-image | hidden fail | The optimizer assertion, as noted above. |
| next-metadata-route-args | hidden fail | 15.3.4's loader emits `generateStaticParams` only in production; passes with `NODE_ENV=production`. |
| next-middleware-proxy, next-unrecognized-action | hidden fail | Harnesses use 16-only modules (`PROXY_FILENAME`, `manifests-singleton`). Behavior on 15 checked by reading its code instead. |
| next-root-params | hidden fail | 16-only loader; passes on 15.3.4 without that step. |
| next-viewtransition-flag | tsc and hidden fail | React 19.1 exports neither name; see the decision above. |
| nextauth-plus-address-login | hidden fail | By design (the test encodes 4.24.15's normalizer). |
| openai-transcript-pending | hidden fail | The runtime `type` assertion, as noted. |
| zod-avatar-data-url, zod-group-booking | hidden fail | Genuine: the stale was already broken on 4.0.14 (see [Needs a decision](#needs-a-decision)). |

## Skips

Every skip's criterion fits its reason. Recommended action for all 57: keep the recorded outcome.

**The S6 rule.** The walk applied S6 as "correct pre-cutoff code still works after the change, so no stale variant can fail". That is the right reading of "no plausible application code depends on it": if the code a pre-cutoff model would write still passes on the pinned version, no task can measure the change. The reasons say what was tried, as S6 requires. No skip goes the wrong way: in every S6 skip the change makes plausible old code *work* or behave the same, never fail, so none of them should become a task. One built task goes the other way: `zod-avatar-data-url` rests on an idiom that never worked before the change, the same situation as skips #113 and #120, and should become an S6 skip (see [Needs a decision](#needs-a-decision)).

**The ones asked about.**

- **#11 react number-input-defaultvalue (S6).** Agree. React 19.1 skipped syncing `defaultValue` on a *focused* number input; 19.3 syncs it. The only visible difference is the `value` attribute while focused, and a form reset during focus without a re-render. Code written for 19.1 is the same JSX.
- **#13 react transitions-render-independently (S6).** Agree, the closest call. The new behavior removes a delay, so 19.1 code works on 19.3. The only code it breaks relies on two *separate* `startTransition` calls committing together; idiomatic code puts related updates in one transition, which is still atomic. Not S8: a test with controlled promises and `act()` would be deterministic, so the reason rightly rests on S6.
- **#119 react batch-resize-updates (S6).** Agree. Both versions settle to the same DOM before the next frame; only code reading the DOM in a microtask right after the event sees a difference, and grading that would be timing-dependent (S8 would also fit).
- **#118 mongoose subdoc-deleteone-hooks (S6).** Agree, verified in the source. 8.16.1 removes the subdocument and runs its pre hooks inside `subdoc.deleteOne()`; 9.11.2 removes it and queues the hooks for the parent's pre-save. With the usual `subdoc.deleteOne(); await parent.save()` the hook runs before `save()` settles in both, and a throwing guard hook rejects the overall operation in both. Only code that never saves the parent differs, which grades an unsaved intermediate state; post hooks would need a database (S2).
- **#16, #22, #36, #57, #87, #115 (Next S6).** Agree. Each either moves a broken configuration's failure earlier (build instead of runtime) or changes internals with the same app-visible result.

| # | change | criterion | verdict | note |
|---|---|---|---|---|
| 2 | lucide flip-2 renamed | S7 | keep | Confirmed: the old names are `X as FlipHorizontal2` entries in the export list, which can't carry `@deprecated`. |
| 3 | jest ESM graph errors before CJS | S2 | keep | Gated on Node 24.9+; the benchmark runs Node 22.22. |
| 7 | zod lazy metadata getters | S6 | keep | 4.0 reported wrong bounds; 4.6 corrects them. |
| 9 | zod e164 tightened | S6 | keep | Only strings starting `+0` changed. |
| 10 | openai migrate CLI removed | S1 | keep | |
| 11 | react number-input defaultValue | S6 | keep | See above. |
| 13 | react transitions independent | S6 | keep | See above. |
| 16 | next tsconfig baseUrl | S6 | keep | The failure would be TypeScript 7's, not Next's. |
| 19 | next turbopack side effects | S1 | keep | |
| 20 | lucide emoji icons renamed | S7 | keep | Same alias mechanism as #2. |
| 22 | next taint compile error | S6 | keep | |
| 27 | next eslint flat config | S2 | keep, note | Process: AUTHORING says a change needing a package the template lacks stays unrecorded until decided. Here even with eslint installed, typescript-eslint rejects the template's TypeScript 7, so the outcome would be a skip anyway. |
| 30 | next turbopack shared runtime | S1 | keep | |
| 32 | next link legacyBehavior | S3 | keep | Confirmed: 15.3.4 already has `@deprecated` and the dev-mode warning. Not a change in the window. |
| 33 | mongoose isAsync middleware | S6 | keep | 8.16.1's types already reject it; its 9.x failure is #14's. |
| 34 | lucide RailSymbol deprecated | S3 | keep | Removed at 1.0.1, a separate population entry. |
| 36 | next react-browser bailout | S6 | keep | |
| 39 | dotenv log tips | S1 | keep | |
| 43 | zod `__proto__` stripped | S6 | keep | Hostile input only. |
| 45 | next-auth nodemailer peer | S4 | keep | |
| 47 | express send keeps params | S6 | keep | Confirmed: 5.1.0 also kept the parameters; only their order differs. (S3-like, as #32; either way a skip.) |
| 49 | react container-with-text warning | S1 | keep | DEV-only `console.error`. |
| 54 | next-auth OAuth checks bound | S6 | keep | |
| 55 | next-auth malformed Bearer | S6 | keep | Malformed input only. |
| 57 | next parallel routes default.js | S6 | keep | |
| 60 | mongoose find(null) throws | S6 | keep | 8.16.1's types reject `null`; only untyped values reach it. |
| 62 | next optimistic routing | S1 | keep | Prefetch optimization. |
| 64 | next dev output dir | S1 | keep | |
| 65 | next 15.5 rejects TS 7 | S3 | keep | 15.5 backport line only. |
| 69 | TS JS declaration emit | S6 | keep | |
| 73 | mongoose browser build removed | S4 | keep | A removed build format, untyped in 8.16.1. |
| 74 | mongoose use$geoWithin removed | S6 | keep | |
| 76 | next image local query warning | S3 | keep | Superseded by the 16.0 `localPatterns` requirement, a separate entry. |
| 78 | react data-block script warning | S1 | keep | |
| 79 | react conditional use() warning | S1 | keep | |
| 87 | next RSC header validation | S6 | keep | |
| 89 | react incomplete-tree error | S6 | keep | |
| 92 | TS dom includes iterable | S6 | keep | |
| 94 | dotenv log prefix | S1 | keep | |
| 95 | react suspensey fonts | S2 | keep | Needs a real browser's font loading and View Transitions. |
| 96 | react CSS shorthand list | S1 | keep | |
| 97 | next-auth no-store headers | S6 | keep | |
| 98 | openai Node 22 minimum | S4 | keep | |
| 101 | TS amd-module deprecated | S7 | keep | |
| 103 | zod emoji components | S6 | keep | |
| 106 | TS outFile deprecated | S5 | keep | Same option as draw 104's removal. |
| 108 | next-auth @auth/core pin | S4 | keep | |
| 109 | mongoose duplicate-index warning | S1 | keep | |
| 110 | mongoose mapReduce types | S6 | keep | |
| 113 | axios URL credentials decoded | S6 | keep | |
| 114 | TS amd-module removed | S5 | keep | Only ever mattered with `module: amd`, draw 63's change. |
| 115 | next ambiguous app routes | S6 | keep | |
| 116 | express unparseable Content-Type | S6 | keep | Confirmed: only malformed values differ (500 on 5.1.0, sent on 5.3.0). |
| 117 | axios UTF-8 encoder | S6 | keep | |
| 118 | mongoose subdoc deleteOne hooks | S6 | keep | See above. |
| 119 | react batched resize updates | S6 | keep | See above. |
| 120 | axios NO_PROXY CIDR | S6 | keep | |

## Worth knowing before the pilot (no action)

- **Checks mode will likely be near ceiling on the compile-error upgrade tasks.** TypeScript 7's errors spell out the fix (for example "Option 'baseUrl' has been removed. … Use '"paths": {"*": ["./src/*"]}' instead."), and `next/amp` simply doesn't resolve. In checks mode every arm sees them; the difference between arms will come mostly from one-shot mode on those tasks. That's a property of the changes, not a defect, and the protocol rightly forbids shaping tasks around it.
- 16 of the 63 tasks are TypeScript's, ten of them `ts-upgrade-*` tasks, as the draw gave them.
- The pinned Next harnesses use internal module paths; if the template's Next version ever changes, re-run validate.ts before trusting them.
