# zod: sources and judgment calls

Built 2026-10-20 following [../POPULATION.md](../POPULATION.md). Repo: colinhacks/zod. Pinned version: **4.6.7**.

## Version range

Stable versions after 2026-06-30 and on or before 2026-10-19, up to 4.6.7 (npm `time`): **13 versions**: 4.5.0, 4.5.1 (2026-08-28; npm lists 4.5.1 a few minutes before 4.5.0), 4.5.2 (08-29 UTC), 4.5.3, 4.5.4 (08-29), 4.6.0, 4.6.1 (09-09), 4.6.2 (09-10), 4.6.3 (09-12), 4.6.4 (09-13), 4.6.5 (09-13), 4.6.6 (10-11), 4.6.7 (10-12). The ~130 `4.5.0-canary.*` prereleases count only through 4.5.0. No 3.x release in the window; no backports.

## Reuse of v3

`bench/heldout-v3/sampling/population/zod.jsonl` covered zod through 2026-10-15. Its 15 entries dated 4.5.0 and 4.6.0 are kept with their v3 ids and summaries (each re-checked against the release notes below). Its 19 entries dated 4.0.16–4.4.2 (2025-08-08 … 2026-05-01) are before 2026-07-01 and dropped. No zod release after 2026-10-15 exists up to 4.6.7.

v3 left out changes "to APIs added inside the window"; its window began 2025-07-31, so that excluded `z.fromJSONSchema()` (added 4.2/4.3) and codecs (4.1). Those APIs predate the v4 window, so their in-window changes were re-read here; three new `fromJSONSchema` entries come from that. APIs added in 4.5/4.6 (`z.compile`, `z.properties`, `z.validate`, `z.withParser`, `z.toZod`, …) are still inside the window and excluded.

## Sources consulted

| Source | URL | Entries |
|---|---|---|
| GitHub releases v4.5.0 … v4.6.7 (`gh api repos/colinhacks/zod/releases --paginate`), including the 4.5.0 and 4.6.0 commit lists | https://github.com/colinhacks/zod/releases/tag/v4.5.0 … /v4.6.7 | 16 (15 reused from v3, sourced to the v4.5.0/v4.6.0 release pages, + `from-json-schema-enforces-six-keywords` from the 4.6.0 notes) |
| PRs read to understand bare commit titles: #6020, #6305, #6535, #6459, #6072 | https://github.com/colinhacks/zod/pull/6020 etc. | 3 (found in the 4.5.0 commit list, sourced to PRs #6020, #6305, #6072) |
| Blog posts `zod-4-5.mdx`, `zod-4-6.mdx` at v4.6.7 (https://zod.dev/blog/zod-4-5, /zod-4-6) | https://github.com/colinhacks/zod/blob/v4.6.7/packages/docs/content/blog/ | 0 new (same ⚠️ sections as the release notes; the 4.6 post adds patch highlights: Tajik locale, faster `z.url()` rejection) |
| Published `.d.ts`, `npm pack zod@4.4.3` vs `zod@4.5.0`, `v4/classic/compat.d.ts` (to confirm the deprecation-tag change) | — | 0 new |

The package has no CHANGELOG.md; the release notes are the changelog. No major release in the window, so no migration guide applies.

## Entries per release

- 4.5.0: 12 (7 breaking, 4 default-behavior, 1 deprecation) — 9 from v3, 3 new
- 4.6.0: 7 (6 breaking, 1 default-behavior) — 6 from v3, 1 new
- 4.5.1–4.5.4, 4.6.1–4.6.7: none

Total 19: 13 breaking, 1 deprecation, 5 default-behavior.

## Judgment calls

### New in v4 (not in v3)

- **`zod@4.5.0/from-json-schema-tuples-open-ended`** (default-behavior). Commit `fix(v4): make fromJSONSchema tuples open-ended by default (#6020)`. A fix to JSON Schema compliance, but the protocol counts a changed default in any section: a tuple without `additionalItems`/`items: false` used to convert to a closed `z.tuple()` and now gets `.rest(z.any())`.
- **`zod@4.5.0/from-json-schema-hostname-format`** (default-behavior, unsure). Commit `feat(v4): support format: "hostname" in fromJSONSchema (#6305)`. Presented as a feature, but the same input JSON Schema used to convert to a plain string accepting anything and now rejects non-hostnames. Included for consistency with the 4.6.0 keyword entry; could be read as a pure feature.
- **`zod@4.5.0/compat-type-aliases-deprecation-surfaced`** (deprecation, unsure). Commit `fix: surface @deprecated on re-exported compat aliases (#6072)`. The aliases were documented as deprecated since 4.0 and carried a `@deprecated` comment in source, but the tag was dropped on re-export, so TypeScript reported 0 deprecation diagnostics before 4.5.0 and 9 after (confirmed in the published `compat.d.ts`: `export type { /** @deprecated */ ZodType as ZodTypeAny }` in 4.4.3 vs a standalone `/** @deprecated */ export type ZodTypeAny<…>` in 4.5.0). The deprecation itself is older; what is new in the window is that it becomes visible. Second look: it may be "first shipped before 2026-07-01".
- **`zod@4.6.0/from-json-schema-enforces-six-keywords`** (default-behavior). The 4.6.0 notes present it as a feature section ("Six additional JSON Schema keywords are now supported"); the PR (#6535, titled `fix(v4): enforce the six JSON Schema keywords fromJSONSchema silently dropped`) shows `z.fromJSONSchema({ type: "object", minProperties: 1 }).safeParse({})` going from success to failure. Same input, different result, outside a fix section.

### Reused from v3

The 15 entries for 4.5.0 and 4.6.0 and their grouping are unchanged; see v3's `zod.sources.md` for the grouping and "included although unsure" reasoning (`string-formats-stricter` grouping, `number-format-types-distinguished` from a `!` commit, `safeparse-error-no-stack-capture` from a perf section, `json-schema-output-changes` from `feat(json-schema)` commits, `metadata-members-lazy-getters` and `base64-email-regexes-rewritten` as reflection-level ⚠️ items).

### Left out, and why

- 4.5.0 `fromJSONSchema` fixes: `prefixItems`/draft-7 `items` respect `minItems` (#6201), `additionalProperties: false` with `patternProperties` (#6199), `propertyNames` composition (#6411), JSON Pointer unescaping (#6402), draft-04 exclusive ranges (#6022) — `fix` commits presented as fixes; no default named.
- 4.5.0 codec/wrapper fixes (`keep a wrapper's stored value only on the side it belongs to`, `resolve z.input past a preprocess transform`, `carry a pipe's own checks through z.output`) — fixes.
- 4.5.0 `fix(v4): empty enums and literals match nothing (#6459)` — also stops `z.literal([])` from throwing at construction; presented as a fix (an empty enum accidentally matched `""`). Left out; flagged as borderline.
- 4.5.0 `fix(v4): make record input keys optional when the value can fill them (#6460)`, `fix(v4): use exact flag in English locale too_small/too_big messages`, `fix(v4): give z.xor() a distinct error` and the other `fix:` commits — fixes or message wording.
- 4.5.0 "9x memory reduction" (methods memoized on the prototype; plucked methods still work, and 4.5.2 fixed `vi.spyOn` on them) — perf.
- 4.5.0 features: `z.compile`, `zod/compile`, `z.creditCard`, `z.properties`, `z.deepPartial`, `.exactPartial`, `z.validate`/`z.isValid`, `z.input`/`z.output`, `z.toZod`, `z.getDiscriminatedOption`, cyclical inputs, symbol keys, tuple `.partial()`, `z.nanoid()` length, `apply()` extra args, `unrepresentable` as a function, locales.
- 4.6.0: `.validate()`, `z.properties()` as a schema (reverted to a check in 4.6.3 — an API added in the window), `z.iban()`, `z.withParser()`, faster CommonJS (frozen plain exports; perf), memory retention fix, `@zod/mini` package, "Stop re-exporting the compile internals from zod/v4/core" (internals added in 4.5).
- 4.6.1, 4.6.2, 4.6.6 fixes (defaulted discriminators, recursive index inference, undefined prefault outputs, record type members, size bounds checked before elements); 4.6.4 `z.currencyCode()` (feature) and `z.url()` via `URL.canParse()` (perf); 4.6.5 `.properties()` typing on `instanceof` (API added in window); 4.5.1–4.5.4 CI, docs and fixes; 4.6.7 version bump only. The 4.6.6 note about reverted malicious commits concerns repository history, not the package.
