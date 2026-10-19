# typescript: population sources

Package `typescript` (repo microsoft/TypeScript; 7.0 is the native port developed in microsoft/typescript-go). Pinned version 7.0.2. Built 2026-10-16 following [POPULATION.md](../POPULATION.md).

## Version range

Stable versions published after 2025-07-31 and on or before 2026-10-15, from `npm view typescript time --json` (UTC):

| version | npm publish date | entries |
|---|---|---|
| 5.9.3 | 2025-09-30 | 0 |
| 6.0.2 | 2026-03-23 | 28 |
| 6.0.3 | 2026-04-16 | 0 |
| 7.0.2 | 2026-07-08 | 26 |

5.9.2 (and the 5.9 feature release) were published on or before 2025-07-31 and are outside the window; only what 5.9.3 itself shipped counts from 5.9. 6.0.0 (beta), 6.0.1 (RC), 7.0.0 (beta) and 7.0.1 (rc) are prereleases and count only through 6.0.2 and 7.0.2. Note the GitHub release of v7.0.2 in microsoft/TypeScript is dated 2026-08-20 (the tag was mirrored late; the original release lives in typescript-go, dated 2026-07-08) and the v5.9.3 GitHub tag was recreated on 2025-10-01; entries use the npm dates.

Totals: 54 entries. By type: breaking 22, deprecation 14, default-behavior 18.

## Sources consulted

### Release blog posts (official release notes)

- https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ (final; read in full as text). **26 entries** (6.0.2): the "Simple Default Changes", `rootDir`, `types` sections (7 default-behavior), "Less Context-Sensitivity on `this`-less Functions", "What's New Since the Beta and RC?" (generic-call checking; the `import()` assert extension merged into the asserts entry), "Combining `--moduleResolution bundler` with `--module commonjs`", "The `dom` lib Now Contains `dom.iterable` and `dom.asynciterable`" (4 default-behavior), the 13 "Deprecated: ..." headings (14 deprecations, since the `amd-module` directive and the two interop options are split out, see judgment calls), and "Specifying Command-Line Files When `tsconfig.json` Exists is Now an Error" (1 breaking).
- https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-beta/ and https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/: headings compared with the final post; identical set of breaking/deprecation sections, nothing extra. 0 entries of their own.
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ (final; read in full). **17 entries** (7.0.2): "Updates Since 5.x, and New Behaviors from 6.0" (13 removals of 6.0 deprecations, counted one per deprecated option/value/construct, plus `stableTypeOrdering` always on), "Template Literal Types Now Preserve Unicode Code Points" (breaking, the post's own word), "Running Side-by-Side with TypeScript 6.0" (no programmatic API), "JavaScript Differences" (the JSDoc forms entry; the post points to CHANGES.md for the rest).
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/ and https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/: compared with the final post. The beta's "Using TypeScript 7.0 Beta" and "Upcoming Work" and the RC's "Nightly Releases" sections only describe the preview package naming (`@typescript/native-preview`, `tsgo`); nothing that qualifies. 0 entries.

### Handbook release-notes pages

- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html: same content and section set as the 6.0 post (checked heading ids). 0 extra entries; the post is cited as the source since its anchors are stable.
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-7-0.html: HTTP 404 on 2026-10-16; the 7.0 blog post is the official notes.

### Wiki

- https://github.com/microsoft/TypeScript/wiki/Breaking-Changes (raw: https://raw.githubusercontent.com/wiki/microsoft/TypeScript/Breaking-Changes.md): the page stops at TypeScript 4.9; there are no 5.9, 6.0 or 7.0 sections. 0 entries.
- https://github.com/microsoft/TypeScript/wiki/API-Breaking-Changes: stops at TypeScript 5.3. 0 entries.

### GitHub releases

- `gh api repos/microsoft/TypeScript/releases --paginate`, stable in window: v5.9.3 (https://github.com/microsoft/TypeScript/releases/tag/v5.9.3), v6.0.2, v6.0.3, v7.0.2. Each body only links to the blog post and the milestone queries. 0 entries of their own.
- `gh api repos/microsoft/typescript-go/releases`: typescript/v7.0.2 (https://github.com/microsoft/typescript-go/releases/tag/typescript%2Fv7.0.2), body is the blog post link. 0 entries of its own.
- Milestone queries the releases link to (`repo:microsoft/TypeScript milestone:"TypeScript 5.9.3"`, `"TypeScript 6.0.2"`, `"TypeScript 6.0.3"`): 5.9.3 has four picks (fix ignored .d.ts from a project reference #62438, add missing Float16Array constructors #62351, revert of #61928 (#62423), parenthesizer fix #62311); 6.0.2 has one (missing lib files in reused programs #63239); 6.0.3 has three (ATA package-name hardening #63368/#63401, class property initializers outside CFA containers #63310). All bug fixes or lib additions, none marked breaking or changing a default. 0 entries.

### Deprecation list, iteration plan and implementing PRs

- https://github.com/microsoft/TypeScript/issues/54500 "6.0 Deprecation List" and https://github.com/microsoft/TypeScript/issues/63085 "TypeScript 6.0 Iteration Plan": used to confirm the set of 6.0 deprecations and defaults and to find changes the post does not spell out. Yielded 2 entries not stated in the post: `moduleresolution-default-bundler` (from PR https://github.com/microsoft/TypeScript/pull/62669, which the post links as the implementation of the module/classic deprecations) and `exactoptionalpropertytypes-missing-vs-undefined` (iteration plan item "More-precise checking under exactOptionalPropertyTypes", PR https://github.com/microsoft/TypeScript/pull/61683, merged 2025-09-30, first stable release 6.0.2).
- https://github.com/microsoft/TypeScript/issues/62208 (amd-module directive): source of the 7.0 `remove-amd-module-directive` entry (the 7.0 post does not name the directive; the issue says it will not work in 7.0). 1 entry.
- PRs read for old/new behavior: #62567 (esModuleInterop/allowSyntheticDefaultImports default to true and false deprecated), #63067 (target default LatestStandard, es5 deprecated), #63089 (alwaysStrict false), #62981 (outFile deprecated, not removed, despite the post's wording), #63163 (the "since beta" generic-call checking change), #63172 (assert in import()), #62320 (bundler + commonjs), #62483 and issue #62439 (exports `null` fallback, see left out), #62423 (5.9.3 revert).

### 7.0 native-port documents

- https://github.com/microsoft/typescript-go/blob/main/CHANGES.md ("intentional changes between the Strada (TypeScript) and Corsa (Go) compilers"; the 7.0 post points to it). **6 entries** (7.0.2): expando patterns, CommonJS patterns (breaking), `--skipLibCheck` conflict reporting, declaration emit from .js, JSDoc tag semantics, call-argument checking in .js (default-behavior); the JSDoc tags/types table is merged into the post's "JavaScript Differences" entry.
- https://github.com/microsoft/typescript-go/blob/main/README.md: feature-status table ("API: not ready", "Declaration emit differs greatly, intentionally" for JS). Confirms entries; 0 of its own.

### npm package metadata

- `npm view typescript@{5.9.2,5.9.3,6.0.2,6.0.3,7.0.2} engines main bin exports dependencies` and `npm pack --dry-run` file lists. **2 entries** (7.0.2): `node-minimum-16-20` (engines `>=14.17` through 6.0.3, `>=16.20.0` in 7.0.2) and `tsserver-binary-removed` (bin `tsc`+`tsserver` through 6.0.3, only `tsc` in 7.0.2; `lib/tsserver.js`, `lib/typescript.js`, `lib/typescript.d.ts` absent). Also confirms `no-programmatic-api` (7.0.2 `exports["."]` is `./lib/version.cjs`, no `main`).

## Judgment calls

### Included (and why)

- **One entry per option, flag value group or construct.** Each 6.0 "Deprecated:" heading is one entry, except: the heading "`--esModuleInterop false` and `--allowSyntheticDefaultImports false`" is two entries (two compiler options); the four `module` values amd/umd/system/none are one entry (several values of one option deprecated together, as the heading groups them); the `amd-module` directive, which the post mentions as a consequence of the `module amd` deprecation and the iteration plan tracks as its own deprecation (#62208), is its own entry. The same split is used for the 7.0 removals.
- **Deprecation in 6.0 and removal in 7.0 are two entries** for every deprecated option/construct (14 + 14). The 6.0 post calls `outFile` and `moduleResolution classic` "removed", but its preamble, the "Preparing for TypeScript 7.0" section, PR #62981 ("Deprecate --outFile") and the 7.0 post all treat them as 6.0 soft deprecations silenced by `ignoreDeprecations: "6.0"` and hard errors in 7.0, so they are typed `deprecation` at 6.0.2 and `breaking` at 7.0.2 like the others.
- **`esModuleInterop` / `allowSyntheticDefaultImports`:** PR #62567 both changes the default to `true` and deprecates `false`. That is one change per option (the option is effectively always on), typed `deprecation`, with the default change stated in the summary, rather than a separate default-behavior entry.
- **7.0 default changes** (`strict`, `module`, `target`, `noUncheckedSideEffectImports`, `libReplacement`, `rootDir`, `types`) are the 6.0 changes carried forward, so they are counted once at 6.0.2. Only `stableTypeOrdering` true-and-locked is new in 7.0 and gets a 7.0.2 entry. The flag itself was added in 6.0 (inside the window), but the behavior it changes (type ordering in unions, declaration emit and inference) predates the window, so the entry stands.
- **Command-line files with tsconfig.json (TS5112):** typed `breaking` at 6.0.2 (an error, not a deprecation; `ignoreDeprecations` does not apply, the escape is `--ignoreConfig`). The 7.0 post lists it among "deprecations that have turned into hard errors", but 7.0 behaves as 6.0 does, so no 7.0 entry (counted once at the first release that shipped it).
- **`moduleresolution-default-bundler`** (6.0.2): not stated in any blog post; PR #62669, linked from the post, says the computed `moduleResolution` default for the `es` module series is now `bundler` (was `classic`). Included because it is a default change the post's own implementation link documents; the user's brief asked for every changed default including `moduleResolution`.
- **`exactoptionalpropertytypes-missing-vs-undefined`** (6.0.2): only in the iteration plan ("More-precise checking under exactOptionalPropertyTypes", PR #61683 fixing #61547, which maintainers had labeled "not a defect"). Not in the release notes. Included under "when unsure, include": it changes type identity for existing code under an existing flag.
- **`generic-call-function-expression-inference`** (6.0.2): PR #63163 is framed as two fixes ported from typescript-go, but the post presents it under "What's New Since the Beta and RC?" as stricter type-checking that "will typically catch more bugs in existing code" and may require explicit type arguments. Included as default-behavior.
- **`bundler-resolution-with-module-commonjs-allowed`** (6.0.2): a relaxation (a previously rejected option combination is accepted). Included because the same tsconfig input now behaves differently (no error) and the post presents it as a behavior change; the walk can skip it.
- **`dom-lib-includes-iterable`** (6.0.2): additive for `lib: ["dom"]`, but `dom.iterable`/`dom.asynciterable` become empty files, so the meaning of existing `lib` arrays changes. Included as default-behavior.
- **7.0 JavaScript-file changes:** grouped by kind following the "several changes of the same kind in one release are one entry" rule: JSDoc forms no longer recognized (one breaking entry, merging the post's bullet list with CHANGES.md's "JSDoc Tags and Types" table), expando patterns no longer supported (one breaking entry), CommonJS patterns no longer supported (one breaking entry), JSDoc tag semantics aligned with TS (one default-behavior entry), call-argument checking in .js (one default-behavior entry: omitted arguments for undefined/unknown/any parameters, and `arguments` no longer implying a rest parameter), declaration emit from .js rewritten (one default-behavior entry). These are typed `breaking` where CHANGES.md says a form is "no longer supported"/"removed" and `default-behavior` where the same input is interpreted differently.
- **`skiplibcheck-conflict-errors-all-sites`** (7.0.2): CHANGES.md "Error reporting under --skipLibCheck"; affects .ts projects. Typed default-behavior (existing input, new errors; not labeled breaking).
- **`no-programmatic-api`** (7.0.2): the post says 7.0 "does not ship with an API" and recommends aliasing `typescript` to `@typescript/typescript6`; the package confirms it (`exports["."]` -> `lib/version.cjs`). Breaking removal of the public JS API. The new `typescript/unstable/*` entry points added in 7.0 are inside the window and not entries.
- **`node-minimum-16-20`** and **`tsserver-binary-removed`** (7.0.2): not in the release notes; taken from package.json `engines`/`bin` and the published file list. Included because the protocol counts a raised minimum Node.js version and a removed public CLI as breaking; sources are the npm package page. Unsure whether package-metadata-only changes belong; flagged for the walk.
- **`remove-amd-module-directive`** (7.0.2): the 7.0 post does not name the directive; issue #62208 says "neither will work in TypeScript 7.0" and the post says every 6.0 deprecation is a hard error. Included to mirror the 6.0 entry.

### Left out (and why)

- **5.9.3** (all milestone items): bug fixes. The revert of #61928 (#62423) restores pre-5.9 `getChildren` scanning for JSX in the services API because the 5.9 change crashed downstream tools; it is a fix of a regression, not a documented behavior change, and the services API is removed in 7.0 anyway.
- **6.0.3**: bug fixes and tsserver ATA hardening only.
- **6.0 new features that leave existing behavior alone:** `es2025` as a `target`/`lib` value (the default-target entry covers the default change; moving `Promise.try`, `Iterator` and `Set` methods from `esnext` into `es2025` changes nothing for `esnext` users), `Temporal` types, `Map.getOrInsert`/`getOrInsertComputed`, `RegExp.escape`, the `--stableTypeOrdering` flag itself (opt-in in 6.0), the `--ignoreConfig` flag (part of the TS5112 entry), `ignoreDeprecations: "6.0"`, the `ts5to6` codemod.
- **Subpath imports starting with `#/`** (6.0): new resolution support mirroring a Node.js 20 addition; such imports did not work anywhere before, so no existing behavior changes. Left out as a feature (unlike bundler+commonjs, which removed a check on an existing option combination).
- **"Updated the DOM types to reflect the latest web standards, including some adjustments to the Temporal APIs"** (6.0 "since beta"): no specific type is named and nothing is marked breaking; the tracking issue #62215 is a stub. Nothing to list. No lib.d.ts removals are documented as breaking in 6.0 or 7.0.
- **Conditional `exports` fallback on `null` values** (PR #62483, issue #62439, in 6.0): the 6.0 deprecation list mentions "conditional imports/exports fallback lookups are deprecated" (#50762), but what shipped is a fix for a defect report (resolution now fails when a custom condition maps `.` to `null`, as in Node) and no deprecation was added. Left out as a bug fix.
- **7.0 parallelism** (`--checkers` default 4, `--builders`, `--singleThreaded`, rebuilt `--watch`): new flags and performance work. The post notes that varying `--checkers` "may surface order-dependent results" in rare cases; not a documented behavior change for a fixed configuration.
- **7.0 compiler-API-level differences** in CHANGES.md ("Scanner": UTF-8 node positions; "Parser": node shape changes such as `OmittedExpression`, `JSDocText`, `JSDocMemberName`): they describe the Go AST behind the new `unstable` API, which was added inside the window; the old JS API is covered by `no-programmatic-api`.
- **`@typescript/native-preview` superseded by `typescript@next`** (7.0 post): a different package.
- **README notes** "types printback in errors may display differently" and "tsconfig errors may not be as helpful": error-message wording only, not presented as a change.
- **Native platform binaries via optional dependencies** (`@typescript/typescript-<platform>` in 7.0.2): packaging; the user-visible effects are the API and tsserver removals already listed.
- **Embedded-language tooling (Vue, Svelte, Astro, MDX, Angular templates) not yet supported on 7.0**: a consequence of the missing API, not a separate change.
