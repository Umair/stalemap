# typescript: population sources

Package `typescript` (repo microsoft/TypeScript; 7.0 is the native port developed in microsoft/typescript-go). Pinned version 7.0.2. Built 2026-10-20 following [POPULATION.md](../POPULATION.md).

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19, from `npm view typescript time --json` (UTC):

| version | npm publish date | entries |
|---|---|---|
| 7.0.2 | 2026-07-08 | 26 |

No other stable version was published in the window (only nightlies/dev builds, which are prereleases). 7.0.0 (beta) and 7.0.1 (rc) are prereleases and count only through 7.0.2. 7.0.2 opens a new major line. 6.0.2 (2026-03-23) and 6.0.3 (2026-04-16) are before the window, so everything 6.0 shipped (the new defaults for `strict`, `module`, `target`, `noUncheckedSideEffectImports`, `libReplacement`, `rootDir`, `types`, the 6.0 deprecations, the TS5112 command-line-files error) is out of the window even though the 7.0 post restates it; only what 7.0.2 itself changed is counted.

Totals: 26 entries. By type: breaking 21, default-behavior 5.

## Reuse of v3

`bench/heldout-v3/sampling/population/typescript.jsonl` covered 7.0.2 (v3 window through 2026-10-15). All 26 of v3's 7.0.2 entries were re-checked against the sources below and kept with their v3 ids and summaries. One summary was extended: `js-expando-patterns-dropped` now also names "expando assignments of `void 0` are no longer ignored" (a CHANGES.md checker heading v3's summary did not list; same kind of change, same release, so merged into the existing entry rather than added). v3's 28 entries dated 6.0.2 are before 2026-07-01 and were dropped. No typescript release after 2026-10-15 exists up to 2026-10-19.

## Sources consulted

- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ (official release post; read in full on 2026-10-20). Entries: "Updates Since 5.x, and New Behaviors from 6.0" (13 removals of 6.0 deprecations, one per option/value/construct, plus `stableTypeOrdering` always on), "Template Literal Types Now Preserve Unicode Code Points" (the post calls it breaking), "Running Side-by-Side with TypeScript 6.0" (no programmatic API; migration guidance: alias `typescript` to `@typescript/typescript6`, `tsc6`), "JavaScript Differences" (JSDoc forms). 17 entries.
- https://github.com/microsoft/typescript-go/blob/main/CHANGES.md (the post's pointer for the full 6.0 to 7.0 differences; read in full). 6 entries: expando patterns, CommonJS patterns (breaking); `--skipLibCheck` conflict reporting, declaration emit from .js, JSDoc tag semantics, call-argument checking in .js (default-behavior). The "JSDoc Tags and Types" table is merged into the post's JSDoc-forms entry.
- https://github.com/microsoft/TypeScript/issues/62208 (the `amd-module` directive "will not work in 7.0"): 1 entry (`remove-amd-module-directive`).
- npm package metadata: `npm view typescript@7.0.2 engines bin exports main` vs `typescript@6.0.3`. 2 entries: `node-minimum-16-20` (engines `>=14.17` to `>=16.20.0`) and `tsserver-binary-removed` (bin `tsc`+`tsserver` to only `tsc`). Also confirms `no-programmatic-api` (`exports["."]` is `./lib/version.cjs`, no `main`; the new `./unstable/*` entry points were added in the window and are not entries).
- GitHub releases: `gh api repos/microsoft/TypeScript/releases` (v7.0.2, body links to the post) and `gh api repos/microsoft/typescript-go/releases` (typescript/v7.0.2, 2026-07-08, body links to the post). 0 entries of their own.
- Migration guidance for the major: the 7.0 post is the official guide (its "Updates Since 5.x" section and the side-by-side section are the upgrade instructions); https://www.typescriptlang.org/docs/handbook/release-notes/typescript-7-0.html returned 404 for v3 and there is no wiki Breaking-Changes section past 4.9. The 6.0 post (https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) is the post the 7.0 post points to for the deprecations; used only to confirm which 7.0 hard errors are removals of 6.0 deprecations.

## Judgment calls

All of v3's 7.0.2 judgment calls carry over (see `bench/heldout-v3/sampling/population/typescript.sources.md`), in short:

- **One entry per removed option, value group or construct** (13 removals plus the `amd-module` directive), typed `breaking`; the four `module` values amd/umd/system/none are one entry.
- **6.0 defaults restated in the 7.0 post are not 7.0 entries** (first shipped 6.0.2, before the window). Only `stableTypeOrdering` true-and-locked is new in 7.0.
- **TS5112 (command-line files with a tsconfig.json)**: the 7.0 post lists it among the hard errors, but 6.0.2 already made it an error; not in the window.
- **`node-minimum-16-20` and `tsserver-binary-removed`** come from package metadata, not the notes; included because a raised Node minimum and a removed CLI are breaking under the protocol. Flagged for the walk (S4 likely for the Node minimum).
- **JavaScript-file changes** are grouped by kind (JSDoc forms, expandos, CommonJS: `breaking`; JSDoc tag semantics, call-argument checking, .js declaration emit: `default-behavior`).
- **Left out**: 7.0 parallelism flags (`--checkers`, `--builders`, `--singleThreaded`) and the rebuilt `--watch` (new flags, performance), CHANGES.md scanner/parser AST-shape notes (they describe the new unstable API added in the window), error-message wording, the `@typescript/native-preview` package, native platform optional dependencies (packaging), embedded-language tooling not yet supported (a consequence of the missing API).
