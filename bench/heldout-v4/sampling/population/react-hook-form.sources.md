# react-hook-form: sources and judgment calls

Package `react-hook-form` (repo `react-hook-form/react-hook-form`). Pinned version **7.90.0**.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`, UTC): **10 versions**: 7.81.0 (2026-07-05), 7.82.0, 7.83.0 (2026-07-25), 7.84.0 (2026-08-01), 7.85.0, 7.86.0, 7.87.0, 7.88.0, 7.89.0, 7.90.0 (2026-10-11). Prereleases 8.0.0-beta.3 and 8.0.0-beta.4 are on the unreleased v8 line and are not counted. No new major line in the window. 7.80.0 (2026-06-20) is before the window.

## Sources consulted

| source | entries |
|---|---|
| https://registry.npmjs.org/react-hook-form (`time`) | 0 |
| GitHub releases v7.81.0–v7.90.0 (`gh api repos/react-hook-form/react-hook-form/releases --paginate`) | 4 (with the changelog) |
| CHANGELOG.md, https://github.com/react-hook-form/react-hook-form/blob/master/CHANGELOG.md (7.81.0–7.90.0) | same 4; the changelog states the `handleSubmit` change that the 7.84.0 release only calls "enhance `<Form />` submit behavior" |
| PRs #13289 (file inputs), #13529 (path depth cap), #13602 (FormState rename), #13605 (submit), #13673 (onChange consistency) | wording and verification |
| Tarballs 7.80.0, 7.83.0, 7.84.0, 7.90.0 (`npm pack`, under `bench/.work/research/react-hook-form/`): `formStateSubscribe.d.ts`, `index.d.ts` exports, `UseFormHandleSubmit` type, `@deprecated` tags 7.80.0 vs 7.90.0, `package.json` peers/engines/exports | verification |
| No migration guide: no major release in the window | – |

Total: **4 entries**: 1 `breaking`, 1 `deprecation`, 2 `default-behavior`.

## Judgment calls, included

- `7.83.0/path-types-depth-capped-at-10`: listed under "Improvements" as type performance; PR #13529 adds a depth counter so `Path<T>` no longer generates names deeper than 10 segments (its type tests assert an 11-segment path is no longer a `Path`). Same input, different type result, presented as a change: default-behavior.
- `7.83.0/file-input-change-event-yields-filelist`: "Enhance `getEventValue` to handle file inputs" (Improvements). PR #13289 changes the value taken from a change event on a file input from `target.value` to `target.files`; this is what `Controller`/`useController` `field.onChange(event)` stores. Default-behavior.
- `7.84.0/form-state-subscribe-renamed-form-state`: release lists it as a chore ("rename `<FormStateSubscribe />` back to `<FormState />`"); `FormStateSubscribe` was the exported name before the window (7.80.0 exports only `FormStateSubscribe`), and 7.84.0's `.d.ts` adds `FormState` and tags `FormStateSubscribe`/`FormStateSubscribeProps` `@deprecated`. Deprecation.
- `7.84.0/handle-submit-returns-onvalid-result`: changelog "`handleSubmit` returns the typed result of the `onValid` callback instead of discarding it"; `UseFormHandleSubmit` goes from `… => Promise<void>` to a generic `<TResult>(…) => … => Promise<Awaited<TResult> | undefined>`. A changed return type of a public function counts as breaking under the rules, though for most callers it is additive. Unsure between breaking and default-behavior; typed breaking.

## Judgment calls, left out

- Fixes that change visible results but are in fix sections and not marked breaking: 7.81.0 `useFieldArray` min-length error location in `errors`, `reset` notifying `subscribe` with `undefined` name; 7.85.0/7.90.0 `useWatch` `defaultValue` vs form `defaultValues` precedence; 7.86.0 `hasValidation` treating `min: 0` etc. as validation; 7.87.0 `field.onChange`-like API consistency (#13673); 7.90.0 new `errors` reference after `setError`/`clearErrors`; the many stale-state fixes in 7.88.0–7.90.0.
- 7.89.0 optional `@types/react` peer: raises no minimum; `react` peer range and `engines` unchanged.
- 7.81.0 `FieldArray` component, 7.82.0 "restore `FieldArray` export" and 7.84.0 "restore `FieldArray`/`FormState` type exports": `FieldArray` was added in 7.81.0 (in the window).
- Features: 7.82.0 `setValue` `delayError`, 7.84.0 function `action` on `<Form />`, 7.85.0 `<Activity />`, 7.86.0 `getErrors`, 7.87.0 `trigger` `shouldTouch` and `OpaqueTypes` (opt-in; types unchanged while empty), 7.88.0 `<ErrorMessage />`, 7.82.0 `resetDefaultValues` on form context.
- 7.81.0 `unset()` prototype-path hardening (security fix), performance, bundle size, refactors, tests, dependency bumps.
