# next-auth: sources and judgment calls

Package `next-auth` (repo nextauthjs/next-auth), stable 4.x line only. Pinned version **4.24.15**. The v5 betas (`5.0.0-beta.*`) and the `@auth/*` packages are ignored except where a 4.x release changes behavior through them (none did).

## Version range

Stable `next-auth` versions published after 2025-07-31 and on or before 2026-10-15, from `npm view next-auth time --json` (UTC):

| version | npm publish date | GitHub release |
|---|---|---|
| 4.24.12 | 2025-10-27 | none (git tag `next-auth@4.24.12` only) |
| 4.24.13 | 2025-10-29 | none (git tag only) |
| 4.24.14 | 2026-04-14 | https://github.com/nextauthjs/next-auth/releases/tag/next-auth%404.24.14 |
| 4.24.15 | 2026-07-20 | https://github.com/nextauthjs/next-auth/releases/tag/next-auth%404.24.15 |

The previous stable, 4.24.11, was published 2024-12-06.

## Sources consulted

| source | entries |
|---|---|
| `npm view next-auth time --json` | version list and dates |
| GitHub release next-auth@4.24.15 ("Security patch release for the 4.x line", five bullets) | 4 (plus the `uuid` bullet, left out) |
| GitHub release next-auth@4.24.14 ("Bugfixes": GitHub provider issuer, #13412) | 1 |
| `gh api repos/nextauthjs/next-auth/releases --paginate`: confirms no release exists for 4.24.12 or 4.24.13 | — |
| `git` compare next-auth@4.24.11...next-auth@4.24.12 (13 commits; `packages/next-auth/src` and `package.json` diffs read) https://github.com/nextauthjs/next-auth/compare/next-auth@4.24.11...next-auth@4.24.12 | 3 |
| compare next-auth@4.24.12...next-auth@4.24.13 (3 commits: "chore: fix apps deps", "chore: bump version", release) https://github.com/nextauthjs/next-auth/compare/next-auth@4.24.12...next-auth@4.24.13 | 1 |
| compare next-auth@4.24.13...next-auth@4.24.14 (1 commit) and next-auth@4.24.14...next-auth@4.24.15 (7 commits; src diffs of `core/lib/oauth/checks.ts`, `core/routes/signin.ts`, `jwt/index.ts`, `utils/detect-origin.ts` read) | confirm the release notes |
| PRs #13304 (nodemailer security fix), #12627 (cache-control headers), #13303 (Next 16 support), #13412 (GitHub issuer), #13469 (getToken hardening, provider-bound checks), #13466 (uuid ^11.1.1), #13422 (uuid v14), #13447 (v4 CI) | used for summaries |
| Advisories GHSA-5jpx-9hw9-2fx4 (email misdelivery via nodemailer, fixed 4.24.12), GHSA-xmf8-cvqr-rfgj (getToken throws), GHSA-7rqj-j65f-68wh (homoglyph `@`), GHSA-x445-f3h2-j279 (check cookies not provider-bound), GHSA-8fpg-xm3f-6cx3 (fail-open auth object; v5 only) | used for summaries; 0 new |
| `packages/next-auth/package.json` at each tag (dependencies, peerDependencies, peerDependenciesMeta) | 2 |
| Changelog file: none exists for v4 (`packages/next-auth/CHANGELOG.md` on the `v4` branch → 404; the repo uses GitHub releases) | — |
| next-auth.js.org: no per-version notes for 4.24.x; the "Upgrade to v4" guide is v3→v4; configuration/options page has no mention of these releases | 0 |

Total: 9 entries: 7 `default-behavior`, 2 `breaking`, 0 `deprecation`.

## How the rules were applied

4.24.12 and 4.24.13 have no release notes, so their git history stands in: every commit between the tags was listed, and every change under `packages/next-auth/src` and in `packages/next-auth/package.json` was read. Security-patch behavior changes the 4.24.15 notes present as changes ("now returns null instead of throwing", "now takes precedence", "are now bound") are `default-behavior` entries per the brief. Peer-dependency range changes count as `breaking` under the protocol's "raises the minimum supported … peer-dependency version" clause; both are optional peers, so they are flagged unsure.

## Judgment calls, 4.24.12

Included:
- `email-normalizer-validates-address` (default-behavior): commit 82efcf81 (#13304, "fix: security issue from nodemailer") changes the default `normalizeIdentifier` in `core/routes/signin.ts` from a lower-case/trim/split to a validator that throws `Invalid email address format.` on quotes, `@`-count ≠ 1, an empty part or a dotless domain. The advisory describes the nodemailer parser bug; the SDK-side change is this validation, which rejects inputs that used to be accepted (and used to reach the mailer). Included as a behavior change, although it ships as a security fix.
- `nodemailer-peer-v7` (breaking, unsure): the same commit moves the `nodemailer` peer range from `^6.6.5` to `^7.0.7` (needed for the parser fix). Optional peer; environment-only, the walk may skip it as S4.
- `get-endpoints-no-store-cache-headers` (default-behavior, unsure): commit 11939f2f (#12627, "feat(core): add default cache control headers for GET endpoints") adds `Cache-Control: private, no-cache, no-store`, `Pragma: no-cache` and `Expires: 0` to the `/session` (non-update) and `/csrf` responses. A feature, but it changes the response an existing endpoint returns for the same request; included on that basis. HTTP-header only, so the walk may find no task.

Left out:
- `feat: add next 16 support` (#13303): widens the `next` peer range to include `^16`; additive.
- `nodemailer` dependency bump itself: covered by the peer entry.
- "chore: remove sponsors", "remove clerk ads", "docs: update banner", the docs commits from 2024-12 to 2025-06 that landed on the v4 branch, LICENSE, funding, workflow files.

## Judgment calls, 4.24.13

Included:
- `auth-core-peer-0-34-3` (breaking, unsure): the only package change between the tags is the optional `@auth/core` peer pin moving from `0.34.2` to `0.34.3` (and the matching devDependency). Included under the raised-peer clause; it is a patch bump of an optional peer, so very likely S4.

Nothing else changed in the package between 4.24.12 and 4.24.13 (the other files are `apps/*` and the lockfile).

## Judgment calls, 4.24.14

Included:
- `github-provider-default-issuer` (default-behavior): the release's one bullet is under "Bugfixes", but it sets a new default (`issuer: "https://github.com/login/oauth"` on the GitHub provider, previously unset), and a changed default counts in any section.

## Judgment calls, 4.24.15

Included (all default-behavior, all from the release notes, each confirmed in the source diff):
- `gettoken-malformed-bearer-null`: `jwt/index.ts` wraps `decodeURIComponent` of the Bearer value in try/catch and returns `null`.
- `oauth-checks-bound-to-provider`: `core/lib/oauth/checks.ts` stores `provider: options.provider.id` in the state/nonce/PKCE cookies and throws on mismatch at the callback; the notes say in-flight sign-ins fail once.
- `email-normalizer-nfkc`: `core/routes/signin.ts` applies `.normalize("NFKC")` before the validation added in 4.24.12. The normalizer predates the window; the NFKC step is new, so this is not a change to an in-window API, but it does refine the 4.24.12 validation.
- `nextauth-url-wins-over-forwarded-host`: `utils/detect-origin.ts` returns `NEXTAUTH_URL` first; before, `VERCEL`/`AUTH_TRUST_HOST` short-circuited to the forwarded host.

Left out:
- "Restores CommonJS compatibility by pinning `uuid` to `^11.1.1`": relative to the last stable (4.24.14, `uuid ^8.3.2`) this is a dependency bump from 8 to 11; the ESM-only `uuid` 14 (#13422, 2026-06-11) was never in a stable release. Not a peer, not marked breaking.
- `@auth/core` peer stays `0.34.3`.
- #13447 (v4 CI, tests, swc/jest config): repository chores.
- GHSA-8fpg-xm3f-6cx3 (auth object populated with an error): affects only `next-auth` 5.0.0-beta.*.
