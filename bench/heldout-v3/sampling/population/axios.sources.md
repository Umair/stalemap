# axios: sources and judgment calls

Package `axios`, 1.x line only (0.x backports ignored per the task brief). Pinned version **1.20.0**.

## Version range

Stable `axios` 1.x versions published after 2025-07-31 and on or before 2026-10-15, from `npm view axios time --json` (UTC):

| version | npm publish date | GitHub release |
|---|---|---|
| 1.12.0 | 2025-09-11 | yes |
| 1.12.1 | 2025-09-12 | yes |
| 1.12.2 | 2025-09-14 | yes |
| 1.13.0 | 2025-10-27 | yes |
| 1.13.1 | 2025-10-28 | yes |
| 1.13.2 | 2025-11-04 | yes |
| 1.13.3 | 2026-01-25 (release page dated 2026-01-20) | yes |
| 1.13.4 | 2026-01-27 | yes |
| 1.13.5 | 2026-02-08 | yes |
| 1.13.6 | 2026-02-27 | yes |
| 1.14.0 | 2026-03-27 | yes |
| 1.14.1 | 2026-03-31 in `time`, **but not in `versions`** (unpublished: `npm view axios@1.14.1` is E404, no tarball, no GitHub release, no changelog section) | no |
| 1.15.0 | 2026-04-08 | yes |
| 1.15.1 | 2026-04-19 | yes |
| 1.15.2 | 2026-04-21 | yes |
| 1.16.0 | 2026-05-02 | yes |
| 1.16.1 | 2026-05-13 | yes |
| 1.17.0 | 2026-06-03 | yes |
| 1.18.0 | 2026-06-14 | yes |
| 1.18.1 | 2026-06-22 | yes |
| 1.19.0 | 2026-07-29 | yes |
| 1.20.0 | 2026-08-26 | yes |

0.x releases in the window (0.30.1 – 0.34.0) are backports and were not read.

## Sources consulted

| source | entries |
|---|---|
| https://github.com/axios/axios/releases/tag/v1.12.0 | 2 |
| https://github.com/axios/axios/releases/tag/v1.12.1, v1.12.2, v1.13.0, v1.13.1, v1.13.2 | 0 |
| https://github.com/axios/axios/releases/tag/v1.13.3 | 1 |
| https://github.com/axios/axios/releases/tag/v1.13.4, v1.13.5, v1.13.6, v1.14.0, v1.15.0 | 0 |
| https://github.com/axios/axios/releases/tag/v1.15.1 | 1 |
| https://github.com/axios/axios/releases/tag/v1.15.2 | 0 (folded into the 1.15.1 entry) |
| https://github.com/axios/axios/releases/tag/v1.16.0 ("Notable Changes") | 6 |
| https://github.com/axios/axios/releases/tag/v1.16.1, v1.17.0 | 0 |
| https://github.com/axios/axios/releases/tag/v1.18.0 and its PR https://github.com/axios/axios/pull/11000 | 4 |
| https://github.com/axios/axios/releases/tag/v1.18.1, v1.19.0 | 0 |
| https://github.com/axios/axios/releases/tag/v1.20.0 ("Breaking Changes & Deprecations") and its PR https://github.com/axios/axios/pull/11141 ("Intentional compatibility changes") | 5 |
| https://github.com/axios/axios/blob/v1.x/CHANGELOG.md (1.12.1 – 1.19.0) and the `main` branch copy | 0 new; same text as the releases, no 1.14.1 or 1.20.0 section |
| PRs/commits read to settle judgment calls: axios#5595 (commit 0dbb7fd, `isCancel` typing), #6269 and #7352 (interceptor error handling), #10761, #10779 (own-property config reads), #10920 and #6792 (zstd), #6d84189 (bracket encoding) | — |
| tarball diffs: `lib/core/Axios.js` 1.13.2 vs 1.13.4; `index.d.ts` of 1.20.0 for the zstd default | — |

Total: 19 entries: 1 `breaking`, 2 `deprecation`, 16 `default-behavior`.

## How the rules were applied

- Section headings govern: items under "Breaking Changes & Deprecations", "Notable Changes" or "Important Changes" that state a behavior change are included; items under "Bug Fixes" are left out unless they change a default (the protocol's "a default value changed, in any section").
- Security fixes count only when they change a default or the behavior of correct code (new default limit, header no longer forwarded, option that used to be ignored). Fixes that only affect crafted or malicious input (prototype pollution via `Object.prototype`, CRLF injection, DoS via `__proto__`, limit bypasses that only mattered if the limit was already set) are bug fixes and left out.
- Behavior on malformed input (rejecting a URL without `//`, a data URI with extra slashes) is included with a note when a source presents it as an intentional change; the walk can apply S6.
- Changes to APIs added inside the window are left out: the `env.fetch`/`Request`/`Response` config (1.12.0), `http2` option (1.13.0), `allowedSocketPaths` (1.15.2), `transitional.advertiseZstdAcceptEncoding` (1.17.0), `transitional.validateStatusUndefinedResolves` (1.18.0), `AxiosHeaders.parseParameters` (1.19.0).

## Judgment calls by version

### 1.12.0
Included:
- `params-encode-brackets`: under "Bug Fixes", but it changes the default params serializer's output for every value containing `[` or `]` (commit 6d84189 removes the `%5B`/`%5D` un-escaping). Counted as a changed default. Unsure.
- `iscancel-type-guard` (breaking): `isCancel(value): value is Cancel` became `value is CanceledError<T>` in `index.d.ts` (commit 0dbb7fd), a public function's return type. Type-only; the CJS typings (`index.d.cts`) got the same change in 1.17.0, folded into this entry.

Left out: `AxiosError.cause` carrying the low-level network error (additive), `env.fetch`/`Request`/`Response` config (feature), `parseReviver` (feature), typed custom response headers (additive type parameter), `maxContentLength` enforced for `data:` URLs (fix; only matters when the option is set), package `exports` fix, Node `FormData` Content-Type fix, build/release noise.

### 1.12.1, 1.12.2
Types fix; fetch adapter uses the current global `fetch` instead of a cached one (bug fix for mocking). 0 entries.

### 1.13.0, 1.13.1, 1.13.2
HTTP/2 support (`http2` option, feature); regression and keep-alive fixes; performance. 0 entries.

### 1.13.3
Included:
- `bun-uses-node-build`: under "Bug Fixes", but adding the `bun` exports condition changes which build, and so which default adapter, Bun gets. Counted as a changed default. Unsure.

Left out:
- "interceptor: handle the error in the same interceptor" (#6269) changed how a request interceptor's rejection handler sees errors; 1.13.4 (#7352) "simplified" the chain again and `lib/core/Axios.js` in 1.13.4 is identical to 1.13.2 apart from an import path, so the net effect in the pinned version is nil. Not listed.
- "silentJSONParsing=false should throw on invalid JSON": reverted within the same release.
- `main` field pointing at the CJS build (#5756): packaging; 1.14.0 then "fixed a `main` entry regression"; no documented API/behavior change in the pinned version.
- "turn AxiosError into a native error" (#5558): bug-fix section; `AxiosError` becomes a real `Error` subclass with no documented observable change for correct code.
- `AxiosError.cause` type restored from `unknown` to `Error`: undoes a type change made earlier in the window; net nil.
- HTTP/2 default port 443: fix to an API added in the window.
- Types/features: `handlers` on `AxiosInterceptorManager`, `undefined` allowed in config values, string-literal IntelliSense, frozen-prototype compatibility, `pipeFileToResponse`, proxy-auth error wording.

### 1.13.4
Fixes to 1.13.3 and CI; "Breaking Changes: None", "Deprecations: None". 0 entries.

### 1.13.5
`__proto__` DoS in `mergeConfig` (crafted input), `AxiosError.status` regression fix, `isAbsoluteURL` input validation (malformed input, bug-fix section). 0 entries.

### 1.13.6
"Breaking Changes: None". React Native `Blob` support (feature), module exports fix, `AxiosError.message` enumerable and `AxiosError.from` copying `status` (bug-fix section). 0 entries.

### 1.14.0
"Breaking Changes: None". "Action Required" points at `proxy-from-env` v2 alignment and the `main` entry fix, both under "Bug Fixes". Header CRLF trimming, HTTP/2 session cleanup, fetch stream probe leak: fixes. 0 entries.

### 1.14.1
Unpublished (see table); no notes anywhere. 0 entries.

### 1.15.0
"Deprecation: `url.parse()` usage has been replaced" is an internal change that silences a Node deprecation; it deprecates nothing in axios. Security fixes (`no_proxy` normalisation SSRF, header-injection chain) act on crafted input. Deno/Bun compatibility: feature. 0 entries.

### 1.15.1
Included:
- `config-own-properties-only`: #10761 makes `mergeConfig` merge own properties only; 1.15.2 (#10779) extends this to the http adapter, `resolveConfig` and validator and makes merged configs null-prototype objects; 1.17.0 (#10901, #10922), 1.18.0 (#11000) and 1.20.0 (#11141, incl. excluding fields inherited from an `Object.create(null)` template) tighten it further. The PRs say "no behavior changes for valid inputs", but a config that inherits fields through its prototype chain is valid code whose fields are now ignored, so one entry is recorded at the first release, with the continuations noted. Unsure.

Left out: header-injection validation, CRLF stripping in multipart headers, `withXSRFToken` non-boolean truthy values (an invalid config value), `maxBodyLength` with `maxRedirects: 0` and streamed `maxContentLength` (limits that only apply when set, previously bypassed), FormData/fetch fixes, progress clamping, `runWhen` typing, case-insensitive response-header keys (type widening), lenient header/config value parsing, `Location` header type (additive).

### 1.15.2
Own-property hardening folded into the 1.15.1 entry. `socketPath` must be a string (malformed input), `allowedSocketPaths` (opt-in feature), keep-alive listener leak (fix). 0 new entries.

### 1.16.0
Included, all from "Notable Changes" (the notes say they "change observable behaviour"): `fetch-enforces-length-limits`, `proxy-preserves-host-header`, `url-credentials-decoded`, `parse-protocol-requires-colon`, `utf8-encoding-replaces-unescape`.
Also included: `fetch-user-agent-header`, from "Bug Fixes" ("set the `User-Agent` header to match the HTTP adapter"): the fetch adapter's default outgoing headers changed, a changed default. Unsure.

Left out: the `transformRequest` typing change (reverted in the same release, net nil); QUERY method, `ECONNREFUSED` constant, `encode` export, `create` re-export (features); redirect listener/`beforeRedirect` argument/stale header fixes, partial response on aborted streams, connect-phase timeout, unsettled-promise hang, abort reason preserved, deferred global access, XHR listener cleanup, `settle` undefined codes, CJS `CancelToken` typings, `RawAxiosHeaders` compile error (fixes).

### 1.16.1
`formDataToJSON` prototype-pollution defence, proxy cleartext leak (security on crafted/misconfigured input); stricter `data:` URI regex, Unicode headers, XHR progress guard, Webpack 4 syntax, `parseReviver` type (fixes); `URL` object support reverted (net nil). 0 entries.

### 1.17.0
zstd decompression is opt-in (`transitional.advertiseZstdAcceptEncoding` defaults to `false` per #10920; confirmed in the 1.20.0 `index.d.ts`), so `Accept-Encoding` did not change: feature. Basic auth restored on same-origin redirects ("Restored": regression fix), fetch/http Basic-auth alignment, proxy TLS options, React Native FormData, empty header names skipped (malformed input), `resolveConfig` export shape (internal), `AxiosHeaders.toJSON()` types, CJS `isCancel` typing (folded into the 1.12.0 entry). 0 entries.

### 1.18.0
Included:
- `strip-sensitive-headers-cross-origin-redirect` (#10892, "Security Fixes"): custom auth headers are no longer forwarded cross-origin; a new default for correct code.
- From #11000, described in the release as "URL And Request Hardening": `malformed-http-url-rejected` (the PR calls it an intentional change: "invalid inputs that were previously normalized now throw"; malformed input, unsure), `formdata-depth-limit` (new default limit `DEFAULT_FORM_DATA_MAX_DEPTH` = 100 with a new error code), `no-proxy-unspecified-local` (`0.0.0.0`/`::` now count as local for `NO_PROXY`; same env input, different proxying; unsure).

Left out from #11000: consistent `maxBodyLength`/`maxContentLength` enforcement on streams (limits that only apply when set), ignoring inherited config/header/`Symbol.iterator` values (folded into the own-properties entry), exact `data:` URL size estimation (fix), `ERR_NOT_SUPPORT` when a custom `Request` lacks stream bodies (edge, API added in window). `transitional.validateStatusUndefinedResolves` is opt-in (feature).

### 1.18.1
`AxiosError#cause` non-enumerable (bug-fix section: JSON serialization of errors changes, but presented as a fix), path-only URLs with `socketPath`, env proxy handling deferred to Node, `maxBodyLength` passed to follow-redirects, encoder `this` (fixes). 0 entries.

### 1.19.0
`form-data` floor raised (dependency), symbol keys preserved in `mergeConfig` and generic params type (additive), `AxiosHeaders.parseParameters()` (opt-in), status 520 (additive). All behavior items are under "Bug Fixes": `formDataToJSON` path splitting limited to dot/bracket notation, `NO_PROXY` IPv4 canonicalization and `*` entries, already-aborted signals, duplicate singleton headers, `getSetCookie()` always returning arrays, redacted URLs in errors, repeated trailing slashes removed when joining `baseURL`, progress clamping, `Set` serialized as arrays, synchronous interceptor failures no longer dispatching, base64 `data:` size. Several of these change results for correct code (`getSetCookie`, trailing slashes), but the notes present them as fixes; left out by rule and noted here.

### 1.20.0
Included:
- `payloadtoolarge-deprecated`, `unprocessableentity-deprecated`: one bullet under "Breaking Changes & Deprecations" deprecates two `HttpStatusCode` aliases; one entry per renamed member.
- From #11141's "Intentional compatibility changes" (the release's "Security Fixes" bullet says "see the PR for documented compatibility effects"): `fetch-maxredirects-zero` (an existing option now honored by the fetch adapter), `no-proxy-cidr` (`NO_PROXY=0.0.0.0/0` / `::/0` now bypass everything; same input, different proxying; unsure), `data-uri-extra-slash-rejected` (malformed input, unsure).

Left out from #11141: custom `fetch` implementations now receive the resolved `Request` and a trimmed second argument (a change to the `env.fetch` option added in 1.12.0, inside the window); explicit `proxy` with HTTP/2 rejects with `ERR_NOT_SUPPORT` (the `http2` option was added in 1.13.0, inside the window); interceptor replacement objects normalized to null-prototype snapshots (edge case of replacing `axios.interceptors.request` wholesale); fields inherited from an `Object.create(null)` template excluded (folded into the own-properties entry).
Left out from "Bug Fixes": XHR navigation-cancelled requests reject with `ECONNABORTED` instead of resolving with status 0 (presented as a fix, though it changes a browser-observable outcome), invalid DNS lookup / `httpVersion` failures standardized as `ERR_BAD_OPTION_VALUE` (invalid option input), `timeoutErrorMessage` merge strategy, interceptor handler trimming, `Error.prepareStackTrace` guard, socket memory retention.
