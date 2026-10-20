# axios: sources and judgment calls (v4)

Package `axios`, 1.x line, pinned **1.20.0**. v3 covered axios through 2026-10-15 (`../../heldout-v3/sampling/population/axios.jsonl`); its five 1.20.0 entries are reused with their ids and summaries; its entries dated before 2026-07-01 are dropped. Every in-window release was re-read here.

## Version range

From `npm view axios time --json`, stable versions published after 2026-06-30 and on or before 2026-10-19:

| version | npm publish | GitHub release |
|---|---|---|
| 1.19.0 | 2026-07-29 | https://github.com/axios/axios/releases/tag/v1.19.0 |
| 1.20.0 | 2026-08-26 (pinned) | https://github.com/axios/axios/releases/tag/v1.20.0 |
| 0.34.0 | 2026-09-16 | https://github.com/axios/axios/releases/tag/v0.34.0 (0.x backport line, see below) |

No 1.x release after 1.20.0 up to 2026-10-19.

## Sources consulted

| source | entries |
|---|---|
| GitHub release v1.19.0 (`gh api repos/axios/axios/releases --paginate`) | 0 |
| GitHub release v1.20.0, "Breaking Changes & Deprecations" (#11082; PR body confirms `@deprecated` tags in `index.d.ts`/`index.d.cts`) | 2 |
| PR https://github.com/axios/axios/pull/11141, section "Intentional compatibility changes" (linked from the v1.20.0 "Security Fixes" bullet: "see the PR for documented compatibility effects") | 7 |
| `CHANGELOG.md` on the `v1.x` branch | 0 new (1.19.0 section identical to the release; no 1.20.0 section) |
| GitHub release v0.34.0 | 0 (0.x line, not the pinned line) |
| `index.d.ts` of the 1.20.0 tarball (checked `httpVersion`, `env.fetch` option names) | — |

Total: 9 entries (1 breaking, 2 deprecation, 6 default-behavior). 5 reused from v3, 4 new.

## Judgment calls

- **New vs v3: the four #11141 items v3 left out because their APIs were added inside v3's window.** v3's window started 2025-08-01, so `env.fetch` (added 1.12.0, 2025-09) and `httpVersion: 2` (1.13.0, 2025-10) were "APIs added in the window" for v3. They predate v4's window, so the changes to them now count: `custom-fetch-request-arg` (custom `fetch` must read the `Request`, the second argument is trimmed; marked breaking because it changes what a public callback receives) and `http2-explicit-proxy-rejects`.
- `null-proto-template-fields-ignored`: v3 folded this into its 1.15.1 own-properties entry, which is dated before v4's window. It is a distinct, newly listed intentional change in 1.20.0, so it gets its own entry here. Unsure (edge case).
- `interceptor-replacement-snapshot`: only affects code that replaces interceptor objects wholesale with objects needing sanitization; listed by the PR as an intentional compatibility change, so included. Unsure.
- `data-uri-extra-slash-rejected` and `no-proxy-cidr`: kept from v3 (malformed input / env-driven; the walk may apply S6/S2).
- 1.19.0: every behavior item is under "Bug Fixes" (formDataToJSON path splitting, NO_PROXY IPv4 canonicalization and `*` entries, already-aborted signals, `getSetCookie()` always returning arrays, repeated trailing slashes removed when joining `baseURL`, synchronous interceptor failures no longer dispatching, Set serialized as arrays); the rest are features (symbol keys in `mergeConfig`, generic params type, `AxiosHeaders.parseParameters()`, status 520) or a dependency floor. Left out by rule, same as v3.
- 1.20.0 "Bug Fixes" left out: XHR navigation-cancelled requests reject with `ECONNABORTED` instead of resolving with status 0 (behavior change, but presented as a fix), invalid DNS lookup / `httpVersion` values standardized as `ERR_BAD_OPTION_VALUE` (invalid input), `timeoutErrorMessage` merge strategy, interceptor array trimming, `prepareStackTrace` guard, socket memory.
- 0.34.0: a backport on the 0.x line, not the pinned 1.x line. Its header-type tightening (#11209, rejects Promise/function header values in TypeScript) was merged after 1.20.0 and is not in the pinned version, so it is not listed. Its CIDR `NO_PROXY` entry is the same change as `no-proxy-cidr`.
