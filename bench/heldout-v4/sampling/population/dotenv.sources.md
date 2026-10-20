# dotenv: sources and judgment calls

Package `dotenv` (repo `motdotla/dotenv`). Pinned version **18.0.8**. Category: utilities.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19, from `npm view dotenv time --json` (UTC). No prereleases. 17.4.2 (2026-04-12) is the last version before the window; nothing newer than 18.0.8 was published by 2026-10-19.

| version | npm publish date |
|---|---|
| 18.0.0 | 2026-09-17 |
| 18.0.1 | 2026-09-18 |
| 18.0.2 | 2026-09-21 |
| 18.0.3 | 2026-09-22 |
| 18.0.4 | 2026-09-25 |
| 18.0.5 | 2026-09-30 |
| 18.0.6 | 2026-10-06 |
| 18.0.7 | 2026-10-09 |
| 18.0.8 | 2026-10-14 |

## Sources consulted

| source | entries |
|---|---|
| https://registry.npmjs.org/dotenv (`time` field) | 0 |
| https://github.com/motdotla/dotenv/blob/v18.0.8/CHANGELOG.md, sections 18.0.0 to 18.0.8 (read in full; 17.4.x read for the pre-window state) | 6: 18.0.0 (4), 18.0.4 (1), 18.0.8 (1) |
| GitHub releases: `gh api repos/motdotla/dotenv/releases` returns an empty list; the repo has tags only | 0 |
| Migration guide for 18.0.0: none exists. No upgrade/migration section in the README at v18.0.0 or v18.0.8, no guide file in the repo tree, no release post beyond the changelog. The README at v17.4.2, v18.0.0 and v18.0.8 was read instead (the `DOTENV_*` precedence note, v18.0.8 line 80; "Config › quiet", line 644; the `dotenv run` environment-defaults section) | 2 (both 18.0.0, from the precedence note) |
| `lib/main.d.ts` at v17.4.2 and v18.0.8, diffed | 0 new (confirms the vault removal, `decrypt()` removal and the 18.0.8 `DotenvPopulateOutput` change) |
| v3's research for this package (`bench/heldout-v3/sampling/population/dotenv.jsonl` and `.sources.md`, window to 2026-10-15), which also read the PRs behind each bullet and `lib/main.js`/`config.js`/`package.json` at the tags | reused, see below |

Total: **8 entries**: 3 `breaking`, 5 `default-behavior`, 0 `deprecation`.

## Reuse of v3

v3 covered dotenv through 2026-10-15 with a window starting 2025-08-01. All 8 v3 entries dated 18.x are kept with v3's `id`, summary and source unchanged: each one is the same change and its first stable release (18.0.0, 18.0.4 or 18.0.8) is inside the v4 window. The 3 v3 entries dated 17.4.0 and 17.4.1 (2026-04) are dropped: before 2026-07-01. There were no dotenv releases between 2026-10-15 and 2026-10-19 to add.

I re-read the 18.0.0 to 18.0.8 changelog and the README/declaration diffs myself and found nothing v3 missed, and no v3 judgment I would reverse.

## Judgment calls, included (same as v3)

- `18.0.0/env-vault-support-removed`: one entry for the whole feature (`DOTENV_KEY` option and env vars, `.env.vault` lookup, `decrypt()` export). Breaking.
- `18.0.0/preload-options-removed`: "Remove preloading" (#1035). `dotenv/config` still exists, but `dotenv_config_<option>=value` arguments and the `lib/env-options`/`lib/cli-options` subpaths are gone. Breaking.
- `18.0.0/injection-log-to-stderr` and `18.0.0/log-tips-removed`: one changelog bullet bundling two changes from two PRs, split. Logging only (S1 is likely), but presented as changes. Default-behavior each.
- `18.0.0/env-vars-apply-to-config-calls` and `18.0.0/code-options-beat-env-vars`: no changelog bullet; from the 18.0.0 README note on `DOTENV_*` precedence compared with 17.x behavior and the 17.2.0 changelog (which said `DOTENV_CONFIG_*` beat code options). Unsure because only the README documents them. Default-behavior each.
- `18.0.4/dotenv-config-quiet-by-default`: restores 17.x's quiet preload after 18.0.0 to 18.0.3 logged; counted at the release that shipped the default. Relative to the pre-window version (17.4.2), `import 'dotenv/config'` is quiet both before and after, so the net change versus "old behavior" is nil; kept because the rules count a default change at the release that ships it, and the walk can skip it (S3/S6). Default-behavior.
- `18.0.8/populate-output-values-maybe-undefined`: "Type detail improvement" (#1074): `DotenvPopulateOutput` values become `string | undefined`. A return-type change of a public function, presented as a correction; unsure, included. Breaking.

## Judgment calls, left out

- 18.0.0 CLI (`dotenv run`) and the opt-in fast parser (`config({ fast })`, `parse(src, { fast })`): new features; the new optional `parse()` parameter leaves existing calls alone. Removal of skill files and the Spanish README: docs. `engines.node` unchanged.
- 18.0.0 `DotenvError.code` type widened from a union of vault codes to `'OBJECT_REQUIRED' | (string & {})` (seen in the `.d.ts` diff): follows from the vault removal; not listed separately.
- 18.0.1 file-URL logging, 18.0.3 `DOTENV_QUIET` inside `.env` (an API added in the window), 18.0.5 missing `dotenv/config` module declaration (fix of an 18.0.0 regression) and performance, 18.0.2/18.0.8 fast-parser fixes (an API added in the window): fixes.
- 18.0.6 `parseBoolean` for `populate()`'s `debug`/`override` string values (#1069): a behavior change for string inputs, but presented as a fix ("to fix override"). Left out, noted here in case the walk wants it.
- 18.0.7 "Treat undefined settings like `quiet: true` as null rather than falsey" (#1070, PR titled "fix: …"): an explicit `undefined` option no longer masks the env variable; presented as a fix. CLI `DOTENV_QUIET` (#1071): CLI added in the window.
