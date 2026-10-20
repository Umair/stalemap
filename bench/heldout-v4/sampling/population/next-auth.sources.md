# next-auth: sources and judgment calls

Package `next-auth` (repo nextauthjs/next-auth). Pinned version **4.24.15** (dist-tag `latest`, 4.x line).

## Version range

Stable `next-auth` versions published after 2026-06-30 and on or before 2026-10-19, from `npm view next-auth time --json`:

| version | npm publish date | GitHub release |
|---|---|---|
| 4.24.15 | 2026-07-20 | https://github.com/nextauthjs/next-auth/releases/tag/next-auth%404.24.15 |

The only other `next-auth` version published in the window is `5.0.0-beta.32` (2026-07-20, dist-tag `beta`). It is a prerelease, and no stable 5.x version exists: `npm view next-auth versions` lists no `5.*` version without a prerelease tag. So the 5.x line contributes nothing, and the in-window release is on the 4.x line. The `@auth/*` releases from the same day are separate packages, left out.

## v3 reuse

v3 (`bench/heldout-v3/sampling/population/next-auth.jsonl`, window to 2026-10-15) had 9 entries. The 5 dated 4.24.12–4.24.14 (2025-10-27 to 2026-04-14) were first shipped before 2026-07-01, so they are dropped. The 4 entries for 4.24.15 are kept with v3's ids and summaries, after checking each one against the release notes myself. No release after 2026-10-15 exists (4.24.15 is still `latest`).

## Sources consulted

| source | entries |
|---|---|
| `npm view next-auth time --json`, `dist-tags`, `versions` | version list and dates; no stable 5.x |
| GitHub release next-auth@4.24.15 ("Security patch release for the 4.x line", five bullets), `gh api repos/nextauthjs/next-auth/releases --paginate` | 4 |
| compare next-auth@4.24.14...next-auth@4.24.15 (7 commits: 2 merged advisories, #13422, #13447, #13466, #13469, release) | confirms the notes; 0 new |
| Changelog file: none for v4 (v3 confirmed that `packages/next-auth/CHANGELOG.md` on the `v4` branch returns 404; the repo uses GitHub releases) | 0 |
| Migration guide: no major release in the window | — |

Total: 4 entries, all `default-behavior`.

## Judgment calls (4.24.15)

Included (as in v3, all from the release notes):
- `gettoken-malformed-bearer-null`: `getToken()` returns `null` for a malformed Bearer value instead of throwing.
- `oauth-checks-bound-to-provider`: state, nonce and PKCE cookies are bound to the provider that minted them.
- `email-normalizer-nfkc`: NFKC normalization before the email provider's address validation.
- `nextauth-url-wins-over-forwarded-host`: an explicit `NEXTAUTH_URL` now beats the forwarded host in trusted-host mode.

These ship as security fixes, but the notes present each one as a change ("now returns", "are now bound", "now takes precedence"), so they count as `default-behavior`.

Left out:
- "Restores CommonJS compatibility by pinning `uuid` to `^11.1.1`": compared with 4.24.14 (`uuid ^8.3.2`) this is a dependency bump. It is not a peer dependency and not marked breaking. The ESM-only `uuid` 14 (#13422) never shipped in a stable release.
- #13447 (v4 CI, lint, test drift): repository chores.
