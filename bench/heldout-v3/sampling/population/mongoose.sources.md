# mongoose: sources and judgment calls

Built 2026-10-16 following [../POPULATION.md](../POPULATION.md) and the population rules in [../../PROTOCOL.md](../../PROTOCOL.md#population-every-change-in-the-window). Repo: Automattic/mongoose. Pinned version: **9.11.2**.

## Version range

Stable versions (no prerelease tag) with an npm `time` entry after 2025-07-31 and on or before 2026-10-15, up to 9.11.2: **83 versions** across four lines.

- 9.x (in scope): 9.0.0 (2025-11-21), 9.0.1, 9.0.2, 9.1.0–9.1.6, 9.2.0 (2026-02-09) –9.2.4, 9.3.0–9.3.3, 9.4.0 (2026-04-03), 9.4.1, 9.5.0, 9.6.0–9.6.3, 9.7.0–9.7.4, 9.8.0, 9.8.1, 9.9.0–9.9.5, 9.10.0–9.10.4, 9.11.0, 9.11.1, 9.11.2 (2026-10-12).
- 8.x (in scope only for a deprecation or default change carried into 9): 8.17.1 (2025-08-07), 8.17.2, 8.18.0–8.18.3, 8.19.0–8.19.4, 8.20.0 (2025-11-17), 8.20.1–8.20.4, 8.21.0, 8.21.1, 8.22.0, 8.22.1, 8.23.0, 8.23.1, 8.24.0–8.24.5.
- 7.8.8–7.8.12 and 6.13.9–6.13.11: pure backports to old lines, ignored as instructed (each contains only fixes also shipped on 9.x).

Dates in the population are the npm publish dates (UTC) from `npm view mongoose time --json`.

## Sources consulted

| Source | URL | Entries |
|---|---|---|
| GitHub releases for every window version (`gh api repos/Automattic/mongoose/releases --paginate`; 81 pages — 6.13.10 and 7.8.9 have no GitHub release) | https://github.com/Automattic/mongoose/releases/tag/9.0.0 … https://github.com/Automattic/mongoose/releases/tag/9.11.2, plus the 8.x/7.x/6.x pages | 9.0.0: 18 BREAKING CHANGE lines → 18 entries (7 of them merged with migration-guide sections); 9.0.2 note on `InferRawDocTypeWithout_id` → 1 entry at 9.0.0; 9.2.0 → 2; 9.4.0 → 1; 8.20.0 → 1 |
| CHANGELOG.md at tag 9.11.2 (every window version; diffed line-by-line against the GitHub release bodies) | https://github.com/Automattic/mongoose/blob/9.11.2/CHANGELOG.md | 1 entry found only here: 9.2.0 "feat(base): add `returnDocument` global option, deprecate `returnOriginal` and `new` #16008" (merged with the guide section). Other differences: formatting only, plus a 9.9.1 line "types(model): apply schema-level lean to find() #16413" (types fix, not qualifying) and 8.24.3's body duplicated. 8.24.5, 7.8.x and 6.13.x sections are absent from the 9.11.2 changelog; their GitHub releases were read instead. |
| Migration guide `docs/migrating_to_9.md` at tag 9.11.2 (every section) | https://github.com/Automattic/mongoose/blob/9.11.2/docs/migrating_to_9.md | 23 sections → 23 entries (one each; 12 are guide-only, 11 merge with 9.0.0 release lines or the 9.2.0 changelog line) |
| Published migration guide (headings compared with the repo file: identical) | https://mongoosejs.com/docs/migrating_to_9.html | 0 new |
| Release blog post for 9.0.0 | none found (web search; https://thecodebarbarian.com/introducing-mongoose-9.html and …/whats-new-in-mongoose-9.html return 404) | 0 |

Checks used only to date or read entries, not to find changes: PRs #15688, #15984, #15979, #15606, #15815 and issue #15814; `gh api repos/Automattic/mongoose/compare/9.0.0...91d803de` and `8.20.1...91d803de` (the `InferRawDocType` commit is in 9.0.0's history and not in 8.20.1's); `types/*.d.ts` at tag 9.11.2 grepped for `FilterQuery` (no occurrences, so it is removed, not aliased).

## Entries per release

- 9.0.0: 30 (all breaking)
- 9.2.0: 3 (1 deprecation, 1 default-behavior, 1 breaking)
- 9.4.0: 1 (deprecation)
- 8.20.0: 1 (default-behavior)

Total 35: 31 breaking, 2 deprecation, 2 default-behavior.

## Judgment calls

### Same-kind groups (none merged)

The rule "several changes of the same kind to items of the same kind in one release are one entry" was applied only where a source presents the changes as one group of like items. Mongoose 9.0.0 has candidate groups — callback support removed (pre middleware `next()`, custom-method hooks, `Document.prototype.updateOne`, `isAsync` middleware, `doValidate()`, `promiseOrCallback`) and options removed (`noListener`, index `background`, `skipOriginalStackTraces`, `skipId`, `use$geoWithin`) — but each is its own migration-guide section on a different API with its own migration step, and the task brief asks for one entry per guide item. They are kept separate; the walk's S5 (duplicate) criterion covers any that turn out to be the same change.

### Merges and splits at 9.0.0

- Release line "asyncify update validators, SchemaType.prototype.doValidate(), save hooks for improved stack traces #15312" and guide section "`Schema.prototype.doValidate()` now returns a promise" are one entry (`dovalidate-returns-promise`): one PR, one theme; the summary mentions the async validators/hooks.
- Release line "remove _executionStack, make validate() async function and call Kareem hooks directly … #15298" and guide section "Removed `skipOriginalStackTraces` option" are one entry (`execution-stack-and-skiporiginalstacktraces-removed`). The "make validate() async" part is internal (Document `validate()` already returned a promise in 8.x).
- Release line "remove schematype caster and casterConstructor … #15513" and the guide section (which also covers `$embeddedSchemaType` → `embeddedSchemaType`) are one entry.
- Guide section "`mongoose.isValidObjectId()` returns false for numbers" covers both `isValidObjectId(6)` and `new ObjectId(6)` throwing: one underlying change, one entry.
- "adding missing pluralizations, fixing pluralization: virus -> viruses #14247" is one entry: one rule-table change, even though it affects several words.
- Guide-only sections with no release line (included, dated 9.0.0 because the guide says "In Mongoose 9"): background index option, isValidObjectId numbers, subdocument deleteOne hooks, custom method/static hooks without callbacks, `Document.prototype.updateOne` callback, `promiseOrCallback`, `isAsync` middleware, Node.js 20.19.0, `skipId` boolean, `use$geoWithin`, `FilterQuery` → `QueryFilter`.
- Release-only lines with no guide section (included): MongoDB driver 7, `find(null)` throws, virtual ref function receives the subdocument, `this` types in default/required/validate, consolidated query selector types, bson no longer a direct dependency, browser build removed, pluralization.
- `mongodb-driver-7` is a dependency bump, included because the release marks it BREAKING CHANGE; the driver's own breaking changes are not enumerated here (they belong to `mongodb`, not to this package).

### Included although unsure

- `mongoose@9.0.0/inferrawdoctype-includes-id`: not in the 9.0.0 notes or the guide. The 9.0.2 note "export InferRawDocTypeWithout_id to replicate Mongoose 8 InferRawDocType behavior #15815 #15814" and issue #15814 show that in 9.0 `InferRawDocType` started adding `_id: ObjectId`; the commit that did it (91d803de, part of the `Schema.create()` work, #15482) is in 9.0.0. Dated 9.0.0, sourced to the 9.0.2 release.
- `mongoose@9.2.0/duplicate-index-warning-delayed`: a `feat` line; it changes when (and with what text) an existing warning fires, which is a behavior change for the same schema, though only logging is affected.
- `mongoose@9.2.0/mapreduce-geosearch-types-removed`: "types(models): remove dead MapReduce and GeoSearch types #15984" removes exported TypeScript types; the functions they described were removed long before. Counted as a removal of public exports.
- `mongoose@8.20.0/document-id-generic-default-objectid`: "types(models): default _id type to ObjectId for Document #15688" changes a type-parameter default (PR: from `unknown` to `ObjectId`) on the exported `Document` class, carried into 9. Counted as a default change; it is type-level only.
- `mongoose@9.0.0/node-20-19-minimum`: the guide states only the new minimum (20.19.0); the summary does not name the old minimum.

### Left out, and why

- 9.x dependency bumps not marked breaking: "upgrade mongodb node driver to 7.2" (9.6.0), 7.5 (9.8.0), 7.6.0 (9.10.0), 7.7.x (9.11.0), kareem 3.3.0/3.4.1 — by rule.
- `fix:` lines that change behavior but are presented as fixes: 9.2.0 "treat undefined as not provided for strict, strictQuery and id options"; 9.3.0 "backwards compatible validateBeforeSave handling", "remove references to mongodb option promiseLibrary"; 9.5.0 update-cloning changes (#16230) and the new `cloneUpdate` option; 9.7.0 "throw error if overwriting array selected with `$slice`", "remove `validateSync()` union fallback"; 9.7.1 populate split over 50k ids; 9.8.0 "don't minimize empty document array elements to null" (also backported to 8.24.2); 9.8.1 "reject update modifiers without paths"; 9.9.2 "apply sanitizeFilter on countDocuments and cursor()" (backported to 8/7/6); 9.9.4 strictQuery/strict on `_mongooseOptions`; 9.10.0 "apply defaults to undefined array elements"; 9.10.3 "don't mutate the caller's update object in bulkWrite updateMany"; 9.11.0 double-called validators. 9.4.1 reverts a 9.4.0 fix.
- `types:` tightening lines presented as fixes or additions (rule applied: a `types` line counts only when it removes/renames a public export, changes a declared default, or is marked BREAKING): 8.18.1 "disallow versionKey: true, which fails at runtime" (PR #15606: catches at compile time an option that already threw); 8.19.0 `lean` schema option; 9.1.0 and 9.4.0 `id` virtual on HydratedDocument by default (follow-ups to the 9.0.0 `id` entry); 9.3.0 constraints on `Document#model()`; 9.4.0 TypeScript error on `$and` with unknown operator, populate marker types; 9.6.0 QueryFilter string unions; 9.9.2 "import BSON from mongodb instead of bson" (follow-up to the 9.0.0 bson entry); 9.10.0/9.11.0 projection and lean narrowing; 9.2.1/9.2.2 duplicate `UUIDToJSON`.
- Features that leave existing behavior alone: 8.18.0 union schema types; 8.21.0/9.1.0 hooks receive options (additional arguments); 8.22.0/9.2.0 `strict` option to `hydrate()`; 8.23.0/9.2.0 `flattenUUIDs`; 9.0.0 `Schema.create()`; 9.1.0 `pathsToSave` subpaths, optimistic-concurrency `exclude`, `getAtomics()`; 9.2.0 middleware `skip` option; 9.3.0 inline `discriminators`, `pipelineForUnionWith()`, query as default-function context; 9.5.0 debug `timestamp`, `defaults` on `find()`; 9.6.0 `allowNull`; 9.7.0 TracingChannel, standard schema adapter; 9.8.0 `strictRead`; 9.10.0 `findAndCount()`, `queryHelper()`; 9.11.0 `Query.prototype.findAndCount()`.
- 8.18.0 "trim long strings in minLength and maxLength error messages" and its partial revert in 8.23.1/9.6.3 — error-message wording, presented as fixes.
- Perf lines (9.0.1 Buffer.equals, 9.1.2 `_id`-only existence check, 9.9.0 `$setOnInsert` for `createdAt` only on upsert, 9.11.2 plugin application to subdocuments, toObject/insertMany work), docs, tests, CI, "chore: remove examples directory", "chore: align Node version docs and types" (9.6.2).
- 9.0.1 "docs(migrating_to_9): clarify removing next() from pre middleware" and 9.9.3 "docs: document new/returnOriginal deprecation from 9.2.0" — docs; the latter confirms the 9.2.0 date of the deprecation entry.
