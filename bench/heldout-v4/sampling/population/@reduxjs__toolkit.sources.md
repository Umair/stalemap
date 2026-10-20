# @reduxjs/toolkit: sources and judgment calls

Pinned **2.13.0**. One stable release in the window: 2.13.0 (npm 2026-09-29). Not a major, so no migration guide applies. No v3 population for this package.

## Sources consulted

| source | entries |
|---|---|
| https://github.com/reduxjs/redux-toolkit/releases/tag/v2.13.0 | 1 |
| Changelog file | none: the repo keeps no CHANGELOG.md (release notes only) |
| Tarball diff 2.12.0 vs 2.13.0: `@deprecated` tags (same 8, formatting only), `peerDependencies` (unchanged) | 0 |

Total: 1 entry (breaking).

## Judgment calls

- `min-typescript-5-6`: "we've also updated our support matrix to TS 5.6+". A raised minimum TypeScript version is breaking under the protocol (the walk will likely apply S4). The previous floor was 5.4 (2.12.0 switched to native `NoInfer`, TS 5.4+).
- Left out: everything under "RTK Query Fixes" and "Other Fixes", presented as fixes: `useQueryState` selector memoization and `isSuccess` staying false during refetch-after-error, `data` reflecting `updateQueryData` during a refetch, polling reading current cache state (so `skipPollingIfUnfocused` respects later focus loss), delayed invalidations after duplicate-request rejection, falsy tag ids, lazy-query resubscription, infinite-query `onQueryStarted` at end of list, `fetchBaseQuery` treating a URL as absolute only if it starts with a scheme, `createAsyncThunk` aborts before `pending` and `rejectedWithValue` for falsy payloads, `createEntityAdapter.setAll` keeping the last duplicate id (to match `setMany`), sorted `updateMany` merging same-id updates, per-instance `combineSlices` proxy cache, circular references in the immutability middleware. The ones closest to a behavior change for correct code are `setAll` with duplicate ids and `fetchBaseQuery` absolute-URL detection; both are framed as fixes, so excluded by rule.
- Left out: TSDown build switch (notes say layout, exports and APIs unchanged), dynamic-middleware caching (performance), codegen moving to oazapfts v7 (separate package `@rtk-query/codegen-openapi`), infinite-query page error flags added to the hook result type (additive), docs site move.
