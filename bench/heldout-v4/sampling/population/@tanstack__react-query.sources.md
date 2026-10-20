# @tanstack/react-query: sources and judgment calls

Pinned **5.104.5**. Monorepo (TanStack/query): read the package's own changelog/release tags and `@tanstack/query-core` changes it re-exports (react-query re-exports all of query-core, including `QueryClient`). No v3 population for this package.

## Version range

From `npm view @tanstack/react-query time --json`: 5.101.3 (2026-07-20), 5.101.4, 5.102.0 (2026-08-22), 5.102.1 – 5.102.8 (2026-08-23 – 08-27), 5.103.0 (2026-09-16), 5.103.1 – 5.103.3, 5.104.0 (2026-09-26), 5.104.1 – 5.104.5 (2026-10-19). 21 stable versions; query-core moves in lockstep with the same version numbers. No major release, so no migration guide applies.

## Sources consulted

| source | entries |
|---|---|
| https://github.com/TanStack/query/blob/main/packages/react-query/CHANGELOG.md (5.101.3 – 5.104.5) | 3 (5.102.0) |
| https://github.com/TanStack/query/blob/main/packages/query-core/CHANGELOG.md (5.101.3 – 5.104.5) | 2 (5.102.0 deprecation, 5.103.0 hydration) |
| GitHub releases `@tanstack/react-query@<v>` and `@tanstack/query-core@<v>` (`gh api repos/TanStack/query/releases`), e.g. https://github.com/TanStack/query/releases/tag/%40tanstack/react-query%405.102.0 | same text as the changelogs (changesets), 0 new |
| PRs read to settle calls: #10658, #10668, #11221, #11233, #11144, #11147, #11245 (+ issue #11018), #11436 | — |
| Tarball diffs, 5.101.2 vs 5.104.5 of react-query and query-core: `@deprecated` tags, `experimental_prefetchInRender`/`promise`, `hydration.js`, `usePrefetchQuery.js` | — |

Total: 5 entries (2 breaking, 1 deprecation, 2 default-behavior).

## Judgment calls

- `imperative-fetch-methods-deprecated` (query-core 5.102.0, #10658, "Minor Changes"): six `QueryClient` methods plus three option types carry `@deprecated` in 5.104.5 (verified in the d.ts). Same kind of change to same kind of item in one release, so one entry. The new `query()`/`infiniteQuery()` are features.
- `prefetch-in-render-removed` (#11221, in a patch-section changeset but the PR labels it "Breaking Changes"): removes a public (experimental) option and result property; both existed long before the window. Included as breaking.
- `use-prefetch-query-uses-query` (react-query 5.102.0 "Minor Changes", #10668): the hooks now call `query()`/`infiniteQuery()`, which respect `enabled`, `skipToken` and `select`; same options can now produce no fetch. Unsure (no note spells out the old/new difference; inferred from the code diff and #10658's description).
- `infinite-options-tdata-default` (#11147, patch "fix"): a public type's generic default changed; options objects annotated with the defaults change type. Included as a type-level breaking change. Unsure.
- `hydrate-requires-dehydratedat` (query-core 5.103.0, #11436, patch "ref"): removes the runtime fallback for dehydrated queries without `dehydratedAt` and makes the field required in the type. Hand-built or pre-May-2025 dehydrated states now hydrate differently. Unsure.
- Left out: `_experimental_beforeQuery`/`_experimental_afterQuery` removal (#11233): underscore-prefixed, untyped internal hooks, not public API. `NoInfer` removal from `useQuery` return types (#11245): reverts a 5.100-era regression (issue #11018), presented as a fix. `useSuspenseInfiniteQuery` ignoring a global `placeholderData` default (#11144): fix; the option was already omitted from its type. Falsy errors thrown to error boundaries in `useQueries` (5.102.6), falsy-error retry on mount (5.104.4), `useMutationState` recomputation (5.104.5), select-error/`isPlaceholderData` resets, `resetQueries`, suspense release on `setQueryData`, partial-key filters with trailing `undefined` (5.103.0), null page params, structural sharing of objects with an own `constructor`: all fixes. Mutation variables optional when `undefined extends TVariables` (type relaxation, additive). Vite 8 build, exports, `@types/react` optional peer, perf, codemods: chores.
