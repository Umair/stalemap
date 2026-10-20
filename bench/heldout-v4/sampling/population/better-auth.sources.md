# better-auth: sources and judgment calls

Package `better-auth` (repo better-auth/better-auth, monorepo, changesets). Pinned version **1.7.11**. No v3 population exists for this package.

## Version range

Stable `better-auth` versions published after 2026-06-30 and on or before 2026-10-19, from `npm view better-auth time --json`. Two lines were released side by side: 1.7.x (`latest`) and 1.6.x backports (`release-1.6`).

| line | versions (npm date) |
|---|---|
| 1.6.x | 1.6.24 (07-22), 1.6.25 (07-23), 1.6.26 (08-04), 1.6.27 (08-11), 1.6.28 (08-13), 1.6.29 (08-14), 1.6.30 (08-17), 1.6.31 (09-10), 1.6.32 (09-14), 1.6.33 (09-14) |
| 1.7.x | 1.7.0 (08-18), 1.7.1 (08-18), 1.7.2 (08-26), 1.7.3 (09-06), 1.7.4 (09-10), 1.7.5 (09-14), 1.7.6 (09-24), 1.7.7 (09-30), 1.7.8 (10-14), 1.7.9 (10-15), 1.7.10 (10-15), 1.7.11 (10-19) |

Prereleases in the window (1.7.0-rc.1 through rc.6, 1.8.0-beta.0/1) count only through 1.7.0. 1.8.0-beta.* never reached a stable release in the window.

## Scope

The population covers the `better-auth` package. Included: everything the GitHub release notes list under the `` `better-auth` `` heading, everything in `packages/better-auth/CHANGELOG.md`, and the sections of the 1.7 upgrade guide that concern `better-auth` APIs (core options, its plugins under `better-auth/plugins`, `better-auth/oauth2`, `better-auth/api`, `better-auth/test`, and the `secondaryStorage`/rate-limit storage contracts it consumes). Left out: changes listed only under the sibling packages' headings (`@better-auth/oauth-provider`, `@better-auth/sso`, `@better-auth/scim`, `@better-auth/stripe`, `@better-auth/expo`, `@better-auth/electron`, `@better-auth/drizzle-adapter`, the `auth` CLI). The exception is when the notes also list a change under `better-auth`: then it is included and flagged below.

## Sources consulted

| source | entries |
|---|---|
| `npm view better-auth time --json` / `dist-tags` | version list and dates |
| GitHub releases, `gh api repos/better-auth/better-auth/releases --paginate`: v1.6.24–v1.6.33 and v1.7.0–v1.7.11 (`` `better-auth` `` and `` `@better-auth/core` `` sections read in full) https://github.com/better-auth/better-auth/releases/tag/v1.7.0 | 32 (1.7.0: ❗ Breaking Changes, Features and changelog detail), 7 (1.7.2–1.7.7) |
| `packages/better-auth/CHANGELOG.md` at tag v1.7.11 (sections 1.6.24–1.7.11, and every 1.7.0-beta/rc section cross-checked against the 1.7.0 section) and at tag v1.6.33 (1.6.31–1.6.33) | details and dating for the above |
| `packages/core/CHANGELOG.md` at v1.7.11 (for `consume` being optional in 1.6.17, #9993) | context |
| 1.7 upgrade guide, `docs/content/docs/guides/1-7-upgrade-guide.mdx` at v1.7.11 (https://www.better-auth.com/docs/guides/1-7-upgrade-guide) | 12 entries that appear only in the guide (generateState, error-code rename, getIP, secondary-storage and rate-limit contracts, passwordless credential cleanup, One Tap subject binding, account selectors, cookie-cache binding, updateTeam, updateMemberRole ordering, two-factor error code) |
| Release blog post "Better Auth 1.7" (`docs/content/blogs/1-7.mdx`) and "The account change in Better Auth 1.7" (`1-7-account-schema.mdx`, the 1.7.3 revert) | 0 new; confirm the guide |
| PRs #10982, #11540 (descriptions) | used for summaries / exclusion |
| npm tarballs better-auth and @better-auth/core 1.6.30, 1.7.0, 1.7.11 (under `bench/.work/research/better-auth/pkg/`) | confirm guide-only items first shipped in 1.7.0: `getIp`→`getIP`, `email_doesn't_match`→`email_does_not_match`, `FAILED_TO_INVALIDATE_TWO_FACTOR_CHALLENGE`, `generateState` signature, `verifyAccessToken`→`verifyBearerToken`, sync request builders, `oidcProvider`/`withMcpAuth`/`genericOAuthClient` removed |

Total: 51 entries: 32 `breaking`, 18 `default-behavior`, 1 `deprecation`. By version: 1.7.0 44, 1.7.2 2, 1.7.3 2, 1.7.6 1, 1.7.7 2. The 1.6.24–1.6.33 backports contributed none: every item there is under "Bug Fixes" or "Features" and changes no default.

## Dating

1.7.0 is minor, not major (better-auth ≥ 1.0), so no entry counts as breaking just because the guide lists it; each one had to meet the rules on its own (a removal, a rename, a signature change or a default). Every 1.7.0 entry was checked against the 1.6.x stable sections of the changelog. #9301, #9305 and #9657 appear in the 1.7.0 notes, but they shipped first in 1.6.13 (2026-05-31, before the window), so they are left out. That excludes 1.7.0's "jwks must be a JWK Set object", "private_key_jwt assertion getters validate at construction" and the `additionalParams` reserved-key rules. The 1.7.0 changeset for #8836 (sync request builders removed, commit 93d3871) is not the 1.6.0 changesets that carry the same PR number (commit 5dd9e44, unrelated content), and the tarball diff confirms the builders exist in 1.6.30 and not in 1.7.0. The 1.6.26 JWKS-in-transaction fix (#10633) and 1.7.0's #10622 are the same fix, and both are excluded.

## Judgment calls: included, worth a second look

- `account-issuer-required` (1.7.0): **reverted in 1.7.3** (#11153). The pinned 1.7.11 keys accounts on (providerId, accountId) again, with no `issuer`. Kept because 1.7.0 shipped it; the walk will likely skip it (S3). The other parts of #10403 survived the revert, per the upgrade guide at v1.7.11, and each is its own entry: `account-selectors-local-id`, `provider-account-subject`, `microsoft-entra-helper-tenant-guid`. 1.7.3's revert is not a separate entry, because it changes an API that was added in the window.
- `access-tokens-end-with-session`, `valid-audiences-replaced-by-resources`, `scim-decoupled-from-organization`, `electron-pkce-s256-only`, `mcp-plugin-moved-out`: the release notes list these under `better-auth`'s "❗ Breaking Changes", but most of the behavior lives in a sibling package (`@better-auth/oauth-provider`, `@better-auth/scim`, `@better-auth/electron`, `@better-auth/mcp`). A task may have to install that package.
- `custom-scheme-trusted-origins-exact-host` and `electron-pkce-s256-only` are split from one bullet (#9645): the `trustedOrigins` matching is a core better-auth change, while the PKCE and option removals belong to the Electron integration.
- #9069 (generic OAuth rewrite) is split into five entries: client APIs replaced, callback path, PKCE default, issuer options removed, URL params narrowed. The "`mapProfileToUser` profile typed as `OAuth2UserInfo & Record<string, unknown>`" item is type-only and left out.
- #10059 is split into three entries: unique indexes and the 191-character limit (breaking), the new default `/device` rate limit, and case- and separator-insensitive matching of default user codes (both default-behavior, unsure).
- #9828 is split into two entries: the custom `UpstreamProvider.verifyIdToken` method removed (breaking), and PayPal id_token sign-in now rejected (default-behavior).
- `one-tap-binds-google-subject`: from the guide's One Tap section ("binds accounts to the verified Google subject instead of matching by email"); no PR named.
- `signout-secondary-storage-runs-delete-hooks` (#9969): the release lists it under "Bug Fixes", but the upgrade guide lists it under "Behavior changes worth noticing". Included on the guide's framing. The other guide "Behavior changes" items about `better-auth` itself are included on the same basis: cookie-cache binding, `updateTeam` immutable fields, `updateMemberRole` ordering, the two-factor error code. `update-team-immutable-fields` is typed `breaking` because it removes accepted request-body fields.
- `device-responses-no-store` (#10065, Features): existing device endpoints now send `Cache-Control: no-store`. Included like v3's next-auth cache-header entry; HTTP-header only.
- `placeholder-email-format` (1.7.2, #10982): under "Bug Fixes", but it changes default generated values (anonymous, SIWE, several social providers), so it counts as a changed default. Old formats are from the PR description.
- `test-instance-fast-hasher` (1.7.2, #10879): a default change in the `better-auth/test` helper; unsure, test-only.
- `password-too-long-on-sign-in` (1.7.6, #11324): under "Bug Fixes", but phrased as a new rule ("are now rejected with `PASSWORD_TOO_LONG`") that changes the error for the same input on sign-in. Unsure.
- `magic-link-verification-prefixes` and `oauth-state-purpose-keys` (1.7.7, #11494): a security fix under "Bug Fixes", but the release has an upgrade callout, and the stored identifier format changes (`magic-link:`, `auth-state:`) so that `verification.storeIdentifier.overrides` rules must be updated. Two entries because the changes are distinct. Unsure.
- `rate-limit-storage-consume-required`: core 1.6.17 (#9993) made `consume` optional with a get/set fallback; the 1.7 guide says get/set storage is no longer accepted.

## Judgment calls: left out

- #10746 (1.7.0 breaking, "Separated OAuth device grant ownership into `oauthDeviceAuthorization()`"): replaces `deviceCodeGrant()` and the shared-grant configuration, which were added in 1.7 prereleases. The migration note concerns only "an earlier 1.7 prerelease". These are changes to APIs added in the window, so the entry is left out. The standalone 1.6 `deviceAuthorization()` flow is unchanged per the guide.
- #11153 (1.7.3 issuer revert): see above. Also left out: "Database adapter atomic methods are optional again" (required in 1.7.0–1.7.2 only). Both are in-window APIs.
- #9079 / guide "`jwt.sign` callbacks must match the configured alg", and every other "As an identity provider" guide section: these are `@better-auth/oauth-provider` behavior and are not listed under `better-auth`.
- Guide "Drizzle relation keys are singular with `usePlural`", "Drizzle affected-row validation", "CLI `generate --output`", "Generated schema and disabled migrations", and "The `auth` CLI requires Node.js 22.12": these belong to the drizzle adapter and the `auth` CLI.
- Guide "Expo secure storage is asynchronous", the SAML/SSO sections and the Stripe sections: sibling packages.
- #10128 (scopes kept across logins): the guide calls it "a behavior fix"; under Bug Fixes.
- #10127 (redirect_uri from per-request base URL), #10125, #10124, #10622: Bug Fixes.
- #10863 (1.7.1, `auth migrate` / `getMigrations` refuses required no-default columns on populated tables and throws `UnsafeMigrationError`): framed as a fix ("Fixed the CLI to refuse…", listed under the `auth` package). Unsure; a second look could add it.
- #10222 (1.6.24, `no-store` on get-session), #10368 (1.6.24, magic-link and email-OTP send endpoints validate `Origin` on cookieless requests), #10040 (1.6.24, invitations use DB-generated ids), #10605 (1.6.26, email OTP no longer reveals registration), #10479 (1.6.25, One Tap respects disabled sign-up): all under "Bug Fixes" on the 1.6 line, and none changes a default.
- #11391 (1.7.8, `customSession` lookup failures now throw), #11766 (1.7.9, `onAPIError.onError` awaited and errors swallowed), #10698 (1.7.8, phone-number reset uses `verifyOTP`), #11646/#11626/#11643 (1.7.8, password reset atomicity), #11393/#11819/#11820/#11821 (1.7.10, One Tap fixes), #11540 (1.7.8, `lastLoginMethod` cookie attributes aligned with the session cookie per the PR), #11491 (1.7.7, ID-token sign-in respects `disableSignUp`): all fixes in "Bug Fixes" with no default changed.
- #11209 (1.7.5): removes the unused optional `better-sqlite3` peer. Removing a peer doesn't raise any minimum.
- Peer widenings (#10299 drizzle-kit, #10501 drizzle-orm, #11488 SvelteKit 3) and bundled-dependency refreshes (#10170, Zod 4.5 in #11066): additive, or dependency bumps not marked breaking.
- Features that leave existing behavior alone: hydrateSession, Auth fetchable, requireEmailVerification (opt-in), validateUserInfo, at_hash, DPoP issuance, Cloudflare provider, isPasswordCompromised, instrumentation toggle, schemaName, BotID, bannedUserMessage function, and so on.
