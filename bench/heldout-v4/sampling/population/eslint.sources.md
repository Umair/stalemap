# eslint: population sources

Package `eslint` (repo eslint/eslint). Pinned version 10.13.0. Built 2026-10-20 following [POPULATION.md](../POPULATION.md). No v3 population exists for eslint.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19, from `npm view eslint time --json` (UTC):

| version | npm publish date | entries |
|---|---|---|
| 9.39.5 | 2026-07-10 | 0 (backport to 9.x: one fix, "handle unavailable require cache", already in 10.x) |
| 10.7.0 | 2026-07-10 | 1 |
| 10.8.0 | 2026-07-24 | 0 |
| 10.8.1 | 2026-08-07 | 0 |
| 10.9.0 | 2026-08-21 | 1 |
| 10.9.1 | 2026-08-24 | 0 |
| 10.10.0 | 2026-09-04 | 3 |
| 10.11.0 | 2026-09-18 | 3 |
| 10.12.0 | 2026-10-02 | 1 |
| 10.13.0 | 2026-10-16 | 3 |

No major release in the window (10.0 is before it), so there is no migration guide to read. Totals: 12 entries, all `default-behavior`. No release in the window has a "Breaking Changes" section, and no note uses "deprecat" except a docs commit about the project's own EOL-version process (#21248).

## Sources consulted

- GitHub releases, `gh api repos/eslint/eslint/releases --paginate`, every tag above: https://github.com/eslint/eslint/releases/tag/v10.7.0 through https://github.com/eslint/eslint/releases/tag/v10.13.0 and https://github.com/eslint/eslint/releases/tag/v9.39.5. Each body is a commit list grouped into Features, Bug Fixes, Documentation, Chores. All 12 entries come from the Features sections.
- Changelog file: https://github.com/eslint/eslint/blob/main/CHANGELOG.md (same commit lists, one flat list per version). 0 extra entries.
- Implementing PRs, read for old/new behavior and default options: #21030, #21041 (radix), #21218 (no-loss-of-precision), #21305 (no-unexpected-multiline), #21269, #21290, #21357 (new-cap), #21260 (no-extra-bind), #21316 (no-unsafe-finally), #21271 (object-shorthand), #21238 (no-use-before-define), #21382 (no-obj-calls), #21399 (no-unsafe-optional-chaining), plus the opt-in/additive ones listed under "Left out". Each entry's `source` is its PR.

## Judgment calls

### Included (and why)

- **Rule "feat" commits that make an existing rule report differently with the same options.** ESLint's semver policy lets minors make rules report more; the release notes put these under "Features", not "Bug Fixes", and several PRs use the rule-change template ("Generate more warnings", "A new default behavior"). The protocol counts an existing public API behaving differently for the same input when the notes present it as a change outside a bug-fix section, so each is `default-behavior`. Some PR bodies (and their bot summaries) call them fixes of false negatives; included anyway because the release notes classify them as features. This is the main call to re-check: if rule-detection widening is judged a fix, all 12 entries go.
- **One entry per rule per release.** Different rules changed in the same release are separate entries (each is a different behavior for different code), rather than one "rules report more" entry per release under the "several changes of the same kind" rule. The two `radix` features in 10.7.0 (#21041 computed `Number["parseInt"]`, #21030 signed radix literals) are one entry (same rule, same release, same kind). `new-cap` changed in three releases (10.10.0, 10.11.0, 10.12.0), three entries.
- **`object-shorthand-ignoreconstructors-quoted`** (10.11.0): the PR template box is "Bug fix", but the release notes list it under Features; it changes what an existing option does (fewer reports). Included under "when unsure, include".
- **`no-use-before-define-iife`** (10.13.0): only affects configurations with `variables: false` or `classes: false` (with the default `true` the references were already reported). Included: existing option, same input, new reports.

### Left out (and why)

- Opt-in options that leave the default alone: `preserve-caught-error` `errorClassNames` (#21032, 10.7.0), `max-nested-callbacks` `checkConstructorCallCallbacks` (#21063, 10.7.0), `no-unmodified-loop-condition` `checkConditionalExpressions` (#21175, 10.9.0).
- Additive: suggestions for `no-compare-neg-zero` (#21034), `ConfigObject` type export from `eslint/config` (#21082, 10.8.0), `SourceCode#getText()`/`getLoc()`/`getRange()` accepting tokens and comments (#21340, 10.12.0; the PR's bot summary says it "removed the `getParent` member" from the type, but the diff only adds a test asserting `getParent` was never on `SourceCode`, so nothing was removed).
- Everything under Bug Fixes (autofix safety, false positives, `__proto__` handling, `TimePass.parse` optional in types #21313, `file-entry-cache` v11 bump #20801), Chores and perf (`perf: Implement fast paths` #21210, cached config globals #21364, `no-redeclare` scan #21365), docs and tests.
- 9.39.5: a single backported fix.
