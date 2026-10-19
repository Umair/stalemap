# dotenv: sources and judgment calls

Package `dotenv` (repo `motdotla/dotenv`). Pinned version **18.0.8**.

## Version range

Stable `dotenv` versions published after 2025-07-31 and on or before 2026-10-15, from `npm view dotenv time --json` (UTC). No prereleases in the window; 17.2.1 (2025-07-24) is the last version before it.

| version | npm publish date |
|---|---|
| 17.2.2 | 2025-09-02 |
| 17.2.3 | 2025-09-29 |
| 17.2.4 | 2026-02-05 |
| 17.3.0 | 2026-02-12 |
| 17.3.1 | 2026-02-12 |
| 17.4.0 | 2026-04-01 |
| 17.4.1 | 2026-04-05 |
| 17.4.2 | 2026-04-12 |
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
| https://github.com/motdotla/dotenv/blob/v18.0.8/CHANGELOG.md, every section from 17.2.2 to 18.0.8 (plus 17.0.0–17.2.1 for the pre-window state of logging and `quiet`) | 8: 17.4.0 (1), 17.4.1 (1), 18.0.0 (4), 18.0.4 (1), 18.0.8 (1) |
| https://github.com/motdotla/dotenv/releases: the repository has **no GitHub releases** (`gh api repos/motdotla/dotenv/releases` returns an empty list; only tags `v17.2.2` … `v18.0.8` exist) | – |
| README at v17.2.1, v18.0.0, v18.0.4 and v18.0.8 (https://github.com/motdotla/dotenv/blob/`<tag>`/README.md), diffed v17.2.1 → v18.0.8; the "Advanced › ES6" note on `DOTENV_*` precedence (v18.0.0 line 75), "Run" section, "Config › quiet" (v18.0.4 onward: "`dotenv/config` imports and preloads default to `true`"), "Environment defaults" table | 2 (both 18.0.0, from the precedence note) |
| PRs referenced by the changelog, read for titles/bodies: #1003, #1005, #915, #912, #1022, #1010, #1037, #1031, #1032, #1034, #1033, #1035, #1054, #1056, #1059, #1063, #1066, #1068, #1069, #1070, #1071, #1073, #1074 | 0 beyond the above |
| Repo files at tags v17.2.1, v17.4.0, v18.0.0, v18.0.3, v18.0.8: `lib/main.js`, `lib/main.d.ts`, `config.js`, `lib/env-options.js`, `lib/cli-options.js` (17.x), `lib/config-options.js` (18.x), `package.json` (`exports`, `main`, `engines`) | 1 (17.4.0 `populate` options type, from `lib/main.d.ts`); the rest verification |

Total: **11 entries**: 4 `breaking`, 7 `default-behavior`, 0 `deprecation`.

dotenv's changelog puts everything under "Changed"/"Added"/"Removed" with no bug-fix section; whether a bullet is a fix was judged from its wording and the PR.

## Judgment calls, included

- `17.4.0/log-prefix-replaced`: "Tighten up logs: `◇ injecting env (14) from .env`" (#1003). Logging only (S1 is likely), but presented as a change and the output of `config()` differs for the same input. Default-behavior.
- `17.4.0/populate-options-type-narrowed`: not in the changelog. `lib/main.d.ts` at v17.4.0 types `populate()`'s third parameter `DotenvPopulateOptions` (`debug`, `override`) where v17.2.1 had `DotenvConfigOptions`; an object literal with `path`/`quiet`/`encoding` no longer type-checks. A signature change of a public function; unsure because no source announces it. Included so the walk can decide. Breaking.
- `17.4.1/log-injecting-to-injected`: wording of the log line (#1005). Same reasoning as 17.4.0. Default-behavior.
- `18.0.0/env-vault-support-removed`: "Remove .env.vault support" (#1033). One entry for the whole feature: the `DOTENV_KEY` option and env vars, the `.env.vault` lookup, the `decrypt()` export and the private `_configVault`/`_parseVault` all go together (confirmed in `lib/main.js` and `lib/main.d.ts` v17.2.1 → v18.0.0). Breaking.
- `18.0.0/preload-options-removed`: "Remove preloading. Instead use cli `dotenv run -- your-command`" (#1035). What actually changed: `config.js` no longer merges `lib/env-options` and `lib/cli-options`, so `dotenv_config_<option>=value` arguments are ignored and the `./lib/env-options` and `./lib/cli-options` subpath exports are gone from `package.json`; `dotenv/config` still exists and calls `config()`. Side effect noted in the summary: 17.x's `cli-options.js` defaulted preloads to `quiet: 'true'`, 18.0.0's `config.js` calls `config()` with no options and so logs, until 18.0.4. Breaking.
- `18.0.0/injection-log-to-stderr` and `18.0.0/log-tips-removed`: the changelog bullet "Injecting message sent to stderr rather than stdout and tips removed" bundles two changes from two PRs (#1037, #1031; the second also appears as "Remove tips" under Removed), so it is split. Both logging only. Default-behavior each.
- `18.0.0/env-vars-apply-to-config-calls` and `18.0.0/code-options-beat-env-vars`: not changelog bullets; from the README added in 18.0.0 ("`DOTENV_*` … provide defaults for `config()` and `dotenv run`. Options/flags passed directly take precedence, followed by `DOTENV_*`, then the legacy `DOTENV_CONFIG_*` names") compared with 17.x, where `configDotenv` read only `DOTENV_CONFIG_DEBUG`/`DOTENV_CONFIG_QUIET` (the path/encoding/override variables applied only through the preload) and the 17.2.0 changelog states that `DOTENV_CONFIG_` variables "take precedence over any code set options". `lib/main.js` v18.0.0 merges `{ ...optionsFromEnv(), ...options }`. Two entries because they are two observable changes (which variables apply to a direct `config()` call; who wins when both are set). The brief asks for README-documented default changes; both are unsure in the sense that no changelog bullet names them. Default-behavior each.
- `18.0.4/dotenv-config-quiet-by-default`: "`import dotenv/config` should default quiet: true" (#1063); README from v18.0.4: "`dotenv/config` imports and preloads default to `true`". A documented default change in the window. Relative to 17.2.1 it restores the old behavior, and the 18.0.0–18.0.3 state is noted on the 18.0.0 preload entry; listed anyway because the rules count a default change at the release that ships it. Default-behavior.
- `18.0.8/populate-output-values-maybe-undefined`: "Type detail improvement" (#1074): `DotenvPopulateOutput` values become `string | undefined`; the PR says consumers with strict null checks may need to narrow. A changed return type of a public function, presented as a declaration correction; unsure, included. Breaking.

## Judgment calls, left out

- 17.2.2: sponsor announcement only.
- 17.2.3 "Fixed typescript error definition" (#912): adds a `code` field to the error type; bug fix (types widen, nothing breaks).
- 17.2.4 "Make `DotenvPopulateInput` accept `NodeJS.ProcessEnv`" (#915): widens an input type to `string | undefined`; fix/feature, no existing call breaks.
- 17.3.0, 17.3.1: README rewrite; 17.4.0 `skills/` folder, 17.4.2 skill files: docs.
- 18.0.0 CLI (`dotenv run`, `bin`) and the opt-in fast parser (`config({ fast })`, `parse(src, { fast })`, `DOTENV_FAST`): features; the new optional `parse()` parameter leaves existing calls unchanged. Removal of skill files and the Spanish README: chores/docs. `main` moving from `lib/main.js` to `dist/index.cjs`: `exports` already blocked deep imports of `lib/main` in 17.x, so the only public subpath change is the one listed under the preload entry. `engines.node` stays `>=12`.
- 18.0.1 "Handle file urls in config logging" (#1054): bug fix (`path: URL` crashed the log line).
- 18.0.2, 18.0.5 (performance), 18.0.8 "fast parser should strip appended extra quotes": fixes and perf of the fast parser, an API added inside the window.
- 18.0.3 "Patch `DOTENV_QUIET` setting when inside .env file" (#1059): restores reading the quiet flag after the file is loaded (17.2.0 behavior for `DOTENV_CONFIG_QUIET`, broken in 18.0.0); `DOTENV_QUIET` itself is new in the window. Bug fix.
- 18.0.5 "Fix missing typescript module declaration" for `dotenv/config` (#1068): fix of an 18.0.0 regression (types moved to `dist/`).
- 18.0.6 "Use smarter `parseBoolean` not Boolean() to fix override" (#1069): `populate()` now parses the strings `'false'`/`'0'`/… for `debug` and `override` the way `config()` does; a behavior change for string inputs, but the bullet and the PR present it as a fix. Left out; noted here in case the walk wants it.
- 18.0.7 "Treat undefined settings like `quiet: true` as null rather than falsey" (#1070, titled "fix: ignore undefined options in config so DOTENV_* env settings still apply"): an explicit `undefined` option no longer masks the env variable; presented as a fix. "CLI should honor `DOTENV_QUIET` in `.env`" (#1071): CLI, added in the window.
- 17.4.0 `DotenvError.code` union (vault error codes) and its 18.0.0 widening to `'OBJECT_REQUIRED' | (string & {})`: type refinements following the vault removal; not separately listed.
