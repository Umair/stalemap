# zod: sources and judgment calls

Built 2026-10-16 following [../POPULATION.md](../POPULATION.md) and the population rules in [../../PROTOCOL.md](../../PROTOCOL.md#population-every-change-in-the-window). Repo: colinhacks/zod. Pinned version: **4.6.7**.

## Version range

Stable versions (no prerelease tag) with an npm `time` entry after 2025-07-31 and on or before 2026-10-15, up to 4.6.7: **43 versions**.

4.0.15, 4.0.16, 4.0.17 (2025-08-06 … 08-09); 4.1.0 (2025-08-23) through 4.1.13 (2025-11-24); 4.2.0, 4.2.1 (2025-12-15/16); 4.3.0 … 4.3.4 (2025-12-31), 4.3.5 (2026-01-04), 4.3.6 (2026-01-22); 4.4.0, 4.4.1 (2026-04-29), 4.4.2 (05-01), 4.4.3 (05-04); 4.5.0, 4.5.1 (2026-08-28), 4.5.2, 4.5.3, 4.5.4 (08-29); 4.6.0, 4.6.1 (2026-09-09), 4.6.2 (09-10), 4.6.3 (09-12), 4.6.4, 4.6.5 (09-13), 4.6.6 (10-11), 4.6.7 (2026-10-12).

4.0.0 shipped 2025-07-09 (before the window), so the 4.0.x line counts only from 4.0.15. Dates in the population are the npm publish dates (UTC) from `npm view zod time --json`. No 3.x releases were published in the window. There are no backports to consider.

## Sources consulted

| Source | URL | Entries |
|---|---|---|
| GitHub releases v4.0.15 … v4.6.7 (`gh api repos/colinhacks/zod/releases --paginate`; 42 release pages — 4.1.6 has no GitHub release, its commit `v4.1.6 (#5222)` appears in the 4.1.7 list) | https://github.com/colinhacks/zod/releases/tag/v4.0.15 … https://github.com/colinhacks/zod/releases/tag/v4.6.7 | 34 (all entries) |
| v4 changelog page (`packages/docs/content/v4/changelog.mdx` at tag v4.6.7, served at https://zod.dev/v4/changelog) | https://github.com/colinhacks/zod/blob/v4.6.7/packages/docs/content/v4/changelog.mdx | 0 new; its "As of v4.4.0 the key is required at parse time too" note on `z.unknown()`/`z.any()` is merged into `zod@4.4.0/undefined-any-unknown-keys-required` |
| v4 migration guide (`packages/docs/content/v4/index.mdx`, https://zod.dev/v4) | https://github.com/colinhacks/zod/blob/v4.6.7/packages/docs/content/v4/index.mdx | 0 (its deprecations — string-format methods, `message`, `.strict()`/`.passthrough()`, `.merge()`, `z.nativeEnum()`, `z.promise()` — all date from 4.0, before the window) |
| Versioning page `packages/docs/content/v4/versioning.mdx` | https://github.com/colinhacks/zod/blob/v4.6.7/packages/docs/content/v4/versioning.mdx | 0 |
| Blog: Zod 4.5 (`packages/docs/content/blog/zod-4-5.mdx`, https://zod.dev/blog/zod-4-5) | https://github.com/colinhacks/zod/blob/v4.6.7/packages/docs/content/blog/zod-4-5.mdx | 0 new (same content as the v4.5.0 release notes) |
| Blog: Zod 4.6 (`blog/zod-4-6.mdx`, https://zod.dev/blog/zod-4-6) | https://github.com/colinhacks/zod/blob/v4.6.7/packages/docs/content/blog/zod-4-6.mdx | 0 new (same as v4.6.0 notes plus 4.6.x patch highlights, none qualifying) |
| Blog: Introducing z.compile, Reducing memory footprint | https://github.com/colinhacks/zod/blob/v4.6.7/packages/docs/content/blog/introducing-z-compile.mdx, …/reducing-memory-footprint.mdx | 0 (feature and perf write-ups) |
| Docs pages at v4.6.7 (`api`, `basics`, `codecs`, `compile`, `error-customization`, `error-formatting`, `index`, `json-schema`, `library-authors`, `metadata`, `packages/core`, `packages/mini`, `packages/zod`), grepped for mentions of 4.1–4.6 and "deprecat" | https://github.com/colinhacks/zod/tree/v4.6.7/packages/docs/content | 0 new (only "Introduced in zod@4.1" notes on codecs and a "requires Zod 4.2+" note on `.brand()` cardinality — features) |
| `packages/docs-v3/CHANGELOG.md`, `MIGRATION.md` | https://github.com/colinhacks/zod/tree/v4.6.7/packages/docs-v3 | 0 (Zod 3 docs; out of scope) |

The repository has no CHANGELOG.md for the package itself; release notes are the changelog.

Checks against the source tree and PRs, used only to date entries and to read bare commit titles (not to find changes):

- `packages/zod/src/v4/core/util.ts` at tags v4.0.17, v4.1.0, v4.3.0, v4.3.1 (extend/pick/omit refinement handling).
- `gh api repos/colinhacks/zod/compare/v4.3.0...bf96635d` and `v4.3.2...bf96635d` (intersection loosening commit).
- PRs #5581, #5574, #5880, #5929, #6052; commits ffff1aac, 8e4739fa, 66bda749, 4bbed1b1.

## Entries per release

- v4.0.16: 1 (default-behavior)
- v4.1.0: 2 (1 breaking, 1 default-behavior)
- v4.1.13: 1 (breaking)
- v4.3.0: 5 (2 breaking, 3 default-behavior)
- v4.3.2: 1 (default-behavior; described in the v4.3.0 notes, shipped in 4.3.2)
- v4.3.4: 1 (breaking)
- v4.4.0: 7 (6 breaking, 1 deprecation)
- v4.4.2: 1 (breaking)
- v4.5.0: 9 (7 breaking, 2 default-behavior)
- v4.6.0: 6 (breaking)

Total 34: 25 breaking, 1 deprecation, 8 default-behavior. Releases with no entry: 4.0.15, 4.0.17, 4.1.1–4.1.12, 4.2.0, 4.2.1, 4.3.1, 4.3.3, 4.3.5, 4.3.6, 4.4.1, 4.4.3, 4.5.1–4.5.4, 4.6.1–4.6.7.

## Judgment calls

### Same-kind groups merged into one entry

The rule "several changes of the same kind to items of the same kind in one release are one entry" was applied where the release notes themselves present the changes as one group of like items (a heading or bullet list of them). Groups the notes present as separate sections with their own migration advice were kept separate even when related.

- `zod@4.4.0/string-validators-stricter`: the "String validators are stricter" section — `z.base64()` whitespace, `z.cuid()` regex (and its JSON Schema pattern), `z.httpUrl()` missing slash. The CUID v1 deprecation from the same bullet is a different kind of change and stays its own entry (`cuid-v1-deprecated`).
- `zod@4.4.0/json-schema-output-fixes`: the "$defs … no longer include redundant id" section together with its "Other JSON Schema fixes in this release" list (draft-04/OpenAPI min/max, recursive lazy with `.describe()`, falsy prefault defaults). The "CUID pattern output tightened" item in that list is part of the cuid regex change and is folded into `string-validators-stricter`.
- `zod@4.4.0/union-error-output-changes`: the two bullets under "Union paths are fixed in formatted errors" (treeify/format paths; discriminator options in issues).
- `zod@4.5.0/string-formats-stricter`: the five bullets under "⚠️ Stricter string formats" (ipv6, ulid, httpUrl host length, emoji backtracking, `includes(position)` JSON Schema pattern), kept as the notes group them even though the last is a JSON Schema output change.
- `zod@4.5.0/json-schema-output-changes`: three `feat(json-schema)` commits in the 4.5.0 list that change `z.toJSONSchema()` behavior for existing inputs (root `$ref` for an id, anyOf compaction to a type array, `override` before the unrepresentable error).
- `zod@4.6.0/base64-email-regexes-rewritten`: the "base64 patterns" and "email pattern dropped its lookaheads" sections — both rewrite a string format's runtime regex with the same kind of reflection and template-literal side effects. `z.emoji()` in the same release changes what is accepted, so it stays separate.

Not merged, by the same principle: the 4.4.0 tuple-defaults and required-keys changes (same PR, separate headlined behaviors); 4.5.0 record-key/intersection matching and "unrecognized_keys no longer aborts" (the notes say "Separately"); 4.6.0 `json-schema-checks-folded` and `metadata-members-lazy-getters` (same PR, different surfaces).

### Dating and merging across sources

- **`extend-refined-object-throws` dated 4.1.0.** The 4.1.0 notes say `.extend()` on a refined object "now throws an error"; `core/util.ts` at v4.1.0 confirms the throw (absent at v4.0.17). The 4.3.0 notes list the same change again under "Potentially breaking bug fixes" (#5317), and 4.3.1 ("allow non-overwriting extends with refinements") narrowed it to throw only when an existing key is overwritten. One entry at the first release that shipped it; the 4.3.1 narrowing is a relaxation of the same change, not a separate entry.
- **`strict-object-intersection-loosened` dated 4.3.2, source = v4.3.0 notes.** The 4.3.0 notes describe it ("More ergonomic intersections", #5587), but the commit (bf96635d, "Loosen strictObject inside intersection (#5587)") is 2 commits after the v4.3.0 tag and inside v4.3.2. Dated at the release that shipped it, per the rules.
- **`undefined-any-unknown-keys-required`** merges the 4.4.0 note ("Required object properties with `z.undefined()`", #5661) with the zod.dev v4 changelog note that `z.any()`/`z.unknown()` keys are required at parse time as of 4.4.0 (same PR, "align object and tuple optionality handling").
- **`record-keys-intersection-match-typescript` + `unrecognized-keys-no-longer-aborts`**: one ⚠️ section in 4.5.0, but the notes say "Separately, …" for the second change, so two entries.
- **`mask-keys-typed-strictly` (4.3.0, "Stricter object masking methods", #5581)**: the runtime already threw `Unrecognized key` at v4.0.17; the PR diff shows the change is the TypeScript type of the mask parameter. Summarized as a type-level change.

### Included although unsure

- `zod@4.0.16/default-clones-pojo`: bare commit title "Clone POJO objects during defaulting/prefaulting" in a patch release, not prefixed `fix:`. It changes what `.default()` returns across parses. (4.4.0 later presents the Map/Set equivalent as a fix.)
- `zod@4.1.0/uuid-accepts-max-uuid`: "Additional changes" item; a loosening of what an existing validator accepts. Could be read as a feature.
- `zod@4.1.13/promise-output-type-wrapped`: bare commit "Update inferred z.promise() type"; the diff changes `$ZodPromiseInternals` output from `output<T>` to `Promise<output<T>>`. A return-type change to a deprecated API, in a patch release with no notes.
- `zod@4.3.0/e164-regex-tightened` and `zod@4.3.0/registry-id-uniqueness-dropped`: under "Additional changes" in 4.3.0, worded as "Tightened …" and "Dropped …" rather than "Fixed …". PR #5574 confirms registry `add()` no longer throws on a duplicate id and `toJSONSchema()` now does.
- `zod@4.3.0/refine-type-predicate-narrows`: presented as a feature, but it changes the inferred output type of existing schemas whose `.refine()` callback is a type predicate (the v4 changelog says 4.0 ignored predicates).
- `zod@4.3.4/mini-refine-method-removed`: bare commit "Remove .refine() from ZodMiniType"; the diff deletes a `refine` method from the public `ZodMiniType` interface and runtime. Unclear whether it was ever documented for Zod Mini.
- `zod@4.4.0/json-schema-output-fixes`: three of its four items are sub-bullets ("Other JSON Schema fixes in this release") inside the "Potentially breaking bug fixes" section and read as plain fixes (one is a stack-overflow fix); the heading marks them, and the task says entries under that heading count as breaking.
- `zod@4.4.0/union-error-output-changes`: formatter fixes, but under the potentially-breaking heading and they change output shape.
- `zod@4.4.2/discriminated-union-option-typing`: bare commit "Tighten discriminated union option typing" in a patch release; the diff requires the discriminator key in each option's input type. A type-level tightening with no notes.
- `zod@4.5.0/string-formats-stricter` includes the `z.emoji()` backtracking item, a perf/ReDoS fix with no claimed accept/reject change; the heading says schemas "may now reject input [they] used to accept".
- `zod@4.5.0/number-format-types-distinguished`: the commit is titled `fix(v4)!:` in the release's commit list; the `!` marks it breaking per the protocol. PR #6052 says it is a type-level narrowing of `ZodNumberFormat`.
- `zod@4.5.0/safeparse-error-no-stack-capture`: presented under "Faster failures" as a performance change, but it states a behavior ("Zod no longer captures this stack trace") that `result.error.stack` consumers observe.
- `zod@4.5.0/json-schema-output-changes`: `feat(json-schema)` commits that change `z.toJSONSchema()` output or callback order for inputs it already handled; not features that leave existing behavior alone.
- `zod@4.6.0/metadata-members-lazy-getters` and `base64-email-regexes-rewritten`: ⚠️ items whose user-visible effect is mostly on reflection (`Object.keys`, `z.regexes.*`) and template-literal composition; included because the notes mark them.

### Left out, and why

- 4.1.0: codecs, `.safeExtend()`, `z.hash()`, `z.hex()` — new features. "`$ZodFunction` is now a subtype of `$ZodType`" — additive type-hierarchy change, nothing existing changes.
- 4.1.3 "Drop stringToBoolean" — removes a docs example codec, not an API. 4.1.5 `z.function()` array input type — additive.
- 4.1.7, 4.1.12, 4.1.13 `fix:`/`Fix` commits (cidrv6, array defaults shallow-cloned, flatten() crash, partial record, opt tuple, globalRegistry dual-package hazard, oneOf for discriminated unions in JSON Schema, recursive tuples, isPlainObject) — bug fixes. "Do not allow unsound pick/omit" was reverted in the same release.
- 4.2.0 / 4.3.0: Standard JSON Schema, `.toJSONSchema()`, `z.fromJSONSchema()`, `z.xor()`, `z.looseRecord()`, `.exactOptional()`, `.apply()`, `.brand()` cardinality, ZodMap methods, `.with()`, `z.slugify()`, `z.meta()`/`z.describe()` in Mini, locales — features. "Fixed …" items under 4.3.0 "Additional changes" (iso.time JSON Schema, tuple error details, includes typing, inclusive messages, implementAsync type, Dutch strings, Date→number in min/max, numeric record keys, lazy `~standard`, NO_SIDE_EFFECTS, metadata tracking, locale approach) — fixes, perf, build.
- 4.3.4 "Drop iso time in fromJSONSchema", "Support patternProperties for looserecord"; 4.4.0 `fromJSONSchema()` metadata/input handling, codec `discriminatedUnion().encode()`, `invertCodec`; 4.6.0 `fromJSONSchema()` keywords; 4.6.3 removal of the standalone `z.properties()` schema added in 4.6.0; 4.6.5 `.properties()` typing — changes to APIs added inside the window (codecs 4.1.0, fromJSONSchema/looseRecord 4.2–4.3, properties 4.5/4.6).
- 4.4.0 "Other fixes": record key transforms now run (#5891), `invalid_key` issues, v3-style single-arg `z.record()` restored, `ctx.addIssue()` on transforms, `when` on `.superRefine()`, Map/Set defaults cloned, empty unions no longer crash at construction, `multipleOf` accuracy, `globalThis` config, jitless, `__proto__` catchall — in a fix section, presented as fixes. Perf (lazy-bound methods, tree-shaking) and locale message wording — excluded by rule. The note that `.merge()` "is discouraged" is not a new deprecation (deprecated since 4.0).
- 4.4.1 "reject tuple holes before required defaults (#5900)", 4.4.3 catch/preprocess on absent keys — follow-up fixes to the 4.4.0 tuple/optionality change.
- 4.4.2 "Make z.preprocess defer optionality to inner schema (#5929)" — PR body says "Fixes #5917"; a bug fix.
- 4.5.0: `z.compile()`, `zod/compile`, `z.creditCard()`, `z.properties()`, `z.deepPartial()`, `.exactPartial()`, `z.validate()`, `z.input()`/`z.output()`, `z.toZod()`, `z.getDiscriminatedOption()`, cyclical inputs, symbol keys, tuple `.partial()`, `z.nanoid()` length, `@zod/mini` — features. "9x reduction in memory footprint" (methods moved to the prototype; notes say plucked methods still work) — perf. `fix:` commits (empty enums match nothing, Mini `merge()` signature, locale tree-shaking, `@deprecated` tags surfaced on compat aliases, JSON Schema fixes, `multipleOf`, catch context, etc.) — fixes. "Preserve callsites in parse stack traces" — fix.
- 4.5.3 "emit record numeric keys as strings in toJSONSchema", 4.5.4 cycle-walk default factory — fixes.
- 4.6.0: `.validate()`, `z.instanceof().properties()`, `z.iban()`, `z.withParser()`, `@zod/mini` lockstep — features; "Faster CommonJS" (plain, frozen exports object) — perf; memory retention in recursive schemas — fix of a 4.5 regression; "Stop re-exporting the compile internals from zod/v4/core" — internals added in 4.5.
- 4.6.1, 4.6.2, 4.6.6 `fix:` commits (defaulted discriminators, recursive index inference, undefined prefault outputs, record type members, size bounds checked before elements) — fixes. 4.6.4 `z.currencyCode()` — feature; `z.url()` via `URL.canParse()` — perf. 4.6.7 — version bump only.
- The 4.6.6 note about malicious commits — repository history, not a change to the package.
