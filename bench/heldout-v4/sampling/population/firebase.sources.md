# firebase: sources and judgment calls

Built 2026-10-20 following [../POPULATION.md](../POPULATION.md). Repo: firebase/firebase-js-sdk (changesets monorepo; the `firebase` package re-exports the `@firebase/*` packages, so their changes ship in `firebase`). Pinned version: **13.0.0**.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`): **12.16.0** (2026-07-09), **12.17.0** (2026-07-30), **12.17.1** (2026-08-04), **12.18.0** (2026-08-19), **12.19.0** (2026-09-09), **13.0.0** (2026-10-07, major). @firebase/ai went 2.13.x → 2.14.0 → 2.15.0 → 2.16.0 → 3.0.0 in the same releases.

## Sources consulted

| Source | URL | Entries |
|---|---|---|
| GitHub releases (bodies list every package's changesets) | https://github.com/firebase/firebase-js-sdk/releases/tag/firebase%4012.17.0, …%4012.17.1, …%4012.18.0, …%4012.19.0, …%4013.0.0 (12.16.0 has no GitHub release) | 12.17.0: 3; 12.18.0: 2; 12.19.0: 1; 13.0.0: 7 |
| `packages/firebase/CHANGELOG.md` at `firebase@13.0.0` (12.16.0 section, and checked against the release bodies, which are a superset) plus `packages/remote-config` and `packages/app` CHANGELOGs for 12.16.0, `packages/ai/CHANGELOG.md` for dating | https://github.com/firebase/firebase-js-sdk/blob/firebase%4013.0.0/packages/firebase/CHANGELOG.md | 12.16.0: 0 (realtime Remote Config rollouts, feature) |
| Official release notes page | https://firebase.google.com/support/release-notes/js | 1 extra item: 13.0.0 removal of other deprecated AI APIs (`AI.location`, `sendMediaChunks`, …), which the changeset summarized only as "Removed APIs that were previously deprecated" |
| Commit log `firebase@12.15.0...firebase@12.19.0` and `firebase@12.19.0...firebase@13.0.0`, for `!` commits not in the changesets | https://github.com/firebase/firebase-js-sdk/compare/firebase@12.19.0...firebase@13.0.0 | 2: `build!: Update minimum required Node version to 24` (#10314) and `fix(firestore)!: UpdateData<T> …` (#7887; its changeset is a patch) |
| Migration guide / blog for 13.0.0 | none found (release notes page links none; web search found none) | 0 |

Published packages checked to confirm entries: `@firebase/ai@2.14.0` vs `@firebase/ai@3.0.0` `ai-public.d.ts` (removed symbols absent in 3.0.0; `ChatSession` class → interface; default hybrid model string `gemini-2.5-flash-lite` → `gemini-3.5-flash-lite`; no `EnterpriseBackend` in 3.0.0); `npm view` engines (`>=20.0.0` in 12.19.0-era packages, `>=24.12.0` in 13.0.0-era packages).

## Entries per release

- 12.17.0: 3 (1 deprecation, 1 breaking, 1 default-behavior)
- 12.18.0: 2 (1 breaking, 1 default-behavior)
- 12.19.0: 1 (default-behavior)
- 13.0.0: 9 (7 breaking, 1 deprecation, 1 default-behavior)

Total 15.

## Judgment calls

### Included although unsure

- `node-24-minimum`: not in any changeset or the release notes page; from the `build!` commit #10314 and the published `engines` fields. Applies to every @firebase package in 13.0.0.
- `firestore-updatedata-indexed-types`: the commit is marked `!` (so breaking under the rules), but the changeset is a patch and the change loosens a type.
- `appcheck-provider-required-again`: `initializeAppCheck()` without a provider existed only in 12.15.0 (2026-06-16, before the window); 12.17.0 reverts it under "Minor Changes" as "Remove ability to …". Counted as a removal.
- `functionserror-status-in-message`: a "Minor Changes" feature that changes `FunctionsError.message` text for the same failure.
- `auth-storage-errors-wrapped` (12.19.0, patch): phrased as a change ("Wrap … in `FirebaseError`"), not a fix; changes the error type/code callers see.
- `ai-hybrid-default-model`: in 13.0.0 it is a sentence inside the "Removed APIs" changeset, split out because it is a separate default change.

### Grouping

- 13.0.0 deprecated-API removals: `VertexAIBackend`/`BackendType.VERTEX_AI` is its own entry (own changeset text and migration: location default), the remaining removed deprecated items are one entry listing them (same kind, same release).
- 13.0.0 `TemplateRequest` refactor and "`templateVariables` required" are one entry (one PR, one API).
- 12.17.0 `VertexAIBackend` deprecation and 13.0.0 removal are separate entries (different changes).

### Left out, and why

- 13.0.0 PR #10392 also added `EnterpriseBackend` and deprecated `AgentPlatformBackend`, but #10439 reverted that before release (not in the published 3.0.0). `AgentPlatformBackend` itself was added in the window (12.17.0), so changes to it are out regardless.
- Features: 12.16.0 Remote Config realtime rollouts; 12.17.0 AI text-to-speech, `grpcFlowControlWindow` option; 13.0.0 Firestore BSON types; 12.19.0 `Temporal.Instant` ↔ `Timestamp`.
- Fixes: 12.19.0 AI "function" role (listed under Minor Changes but described as a fix), `text/x.enum` validation; auth IndexedDB/pagehide/in-memory fallback fixes (12.17.0, 12.18.0, 12.19.0); 13.0.0 auth persisted user on quota errors, Remote Config background stream errors, Firestore `Temporal` declaration; 12.17.0 ReDoS fix; 12.17.1 database-compat bundling; Firestore log text; fetch error messages.
- 12.17.0 `initializeApp()` duplicate-call error detail (message text only); 12.17.0 `@firebase/app` added as a peerDependency of the compat packages (bundled inside `firebase`, which already depends on `@firebase/app`; no effect for `firebase` users); 12.18.0 App Check debug-token log text; SQL Connect WebSocket path, backoff and headers (internal transport); devDependency and api-extractor updates; Vitest migrations.
