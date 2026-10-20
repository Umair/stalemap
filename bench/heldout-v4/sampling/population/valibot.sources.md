# valibot: sources and judgment calls

Built 2026-10-20 following [../POPULATION.md](../POPULATION.md). Repo: open-circle/valibot (formerly fabian-hiller/valibot). Pinned version: **1.5.0**.

## Version range

Stable versions after 2026-06-30 and on or before 2026-10-19, up to 1.5.0 (npm `time`): **1.5.0** (2026-09-09) only. 1.4.2 (2026-06-28) is before the window. No major release, so no migration guide applies.

## Sources consulted

| Source | URL | Entries |
|---|---|---|
| GitHub release v1.5.0 (`gh api repos/open-circle/valibot/releases --paginate`) | https://github.com/open-circle/valibot/releases/tag/v1.5.0 | 1 |
| `library/CHANGELOG.md` (v1.5.0 section; identical bullets) | https://github.com/open-circle/valibot/blob/main/library/CHANGELOG.md | 0 new |
| Published package diff, `npm pack valibot@1.4.2` vs `valibot@1.5.0`, `dist/index.d.mts` and `dist/index.mjs` export list (to confirm the removed export only) | — | 0 new |

Releases of sibling packages in the same repo (`@valibot/to-json-schema` v1.8.0, `@valibot/i18n` v1.3.0) are separate npm packages, not `valibot`, and were not used.

## Entries

1.5.0: 1 (breaking). Total 1.

## Judgment calls

- **Included, unsure: `valibot@1.5.0/get-standard-props-replaced`.** The notes call `_getStandardProps` an "internal utility", and it is not in the valibot.dev API reference, but it was a named export of the package in 1.4.2 (in the `export { … }` list and in `index.d.mts`, with no `@internal` tag, unlike its neighbour `_getLastMetadata`) and is absent in 1.5.0, replaced by `_standardSchema` (which is tagged `@internal`). The protocol counts removing a public export as breaking. Custom-schema authors used it to build `~standard`.
- **Left out: eager initialization of `~standard`** (same bullet). Presented as a construction-speed change; `schema['~standard']` returns the same props. Not split into its own entry.
- **Left out:** `codePoints`/`maxCodePoints`/`minCodePoints`/`notCodePoints` and `ksuid` actions (features); `url` via `URL.canParse` (perf, same acceptance); all "Fix" bullets — `stringifyJson` undefined, `NaN` equality in `literal`/`value(s)`/`notValue(s)`, `intersect` NaN/invalid dates and inherited properties, `cache` issue cloning, object schemas with `Object.prototype`-colliding keys, `ulid` max value, `email` non-ASCII case folding. These are in the fix list and none is presented as a default change. The `email` and `ulid` items reject input that was accepted before; flagged in case the walk wants to revisit, but by rule they are bug fixes.
