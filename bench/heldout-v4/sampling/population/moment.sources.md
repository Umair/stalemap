# moment: sources and judgment calls

Package `moment` (repo `moment/moment`). Pinned version **2.31.0**. Category: utilities.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19, from `npm view moment time --json` (UTC): only **2.31.0** (npm 2026-09-15T01:07Z; the changelog says "Released Sep 14, 2026", US time). The previous release is 2.30.1 (2023-12-27). No prereleases.

The GitHub release object named "2.30.1" was published on 2026-07-26, but its body says it only re-marked the existing 2023 version as `latest`; it is not a new version and is ignored.

## Sources consulted

| source | entries |
|---|---|
| https://registry.npmjs.org/moment (`time` field) | 0 |
| https://github.com/moment/moment/releases/tag/2.31.0 (GitHub release notes) | 7 (same text as the changelog) |
| https://github.com/moment/moment/blob/2.31.0/CHANGELOG.md, section 2.31.0 | same 7 |
| Migration guide: none; 2.31.0 is a minor release | – |
| PRs behind every "Updates to existing locales" bullet, read for the actual diff to `src/locale/*.js`: #5404, #6197, #6217, #6289, #6306, #6347, #6360, #6370, #6371, #6391, #6396, #6409, #6410 | used to word the summaries |
| GHSA-4p3w-j4w9-5jqw (the 2.31.0 security fix) | 0 |
| `gh api repos/moment/moment/compare/2.30.1...2.31.0`: `moment.d.ts` (comment line only), `package.json` (no `exports`, `engines.node` still `*`; a `files` list added), `src/lib/**` | 0 |

Total: **7 entries**, all `default-behavior`.

## How the notes are organised, and the main judgment

The 2.31.0 notes have four sections: "Security fixes", "Bug fixes", "New features" (one internal hook plus new locales) and **"Updates to existing locales"**. The last is not a bug-fix section, and every bullet in it changes what an existing API (`format()`, `calendar()`, `fromNow()`, `week()`, parsing) returns for the same input in that locale. Under PROTOCOL.md's default-behavior rule ("an existing public API now behaves differently for the same input and the notes present that as a change rather than a fix (outside a bug-fix section…)"), and in the uk case "a default value changed" (the locale's `week.doy`), they count. Several bullets are worded "Fix …"/"Correct …" and several PRs are titled "[bugfix]"; I included them anyway because the release notes file them outside the bug-fix section and the rule says when unsure, include. This is the call that makes moment qualify at all; worth a second look.

Grouping: the rules make several changes of the same kind to items of the same kind in one release one entry. I grouped the 13 locale bullets by the kind of locale data that changed (week config, month names, weekday names, `L` format, calendar strings, relative-time strings, month parsing), not one entry per locale and not one entry for all of them. Bullets were placed by what the PR diff actually changes, which twice differs from the bullet's wording:

- #6306 Catalan "Use typographic apostrophes in relative time": the diff changes the `months.format` names (d'abril → d’abril), not relative time. Put under month names.
- #6391 Swahili "Fix weekday and relative-time grammar" bundles a calendar change (weekday-first phrases) and a relative-time change (past suffixes). Split across the calendar and relative-time entries; #6347 (Swahili 'saat' → 'saa', calendar) joins the calendar entry.
- #5404 pt-br "Fix wrong plural usage for time": the diff changes `calendar` strings ('à' vs 'às' by hour). Put under calendar.

## Judgment calls, included

- `uk-iso-week-numbering`: #6360 (PR titled "[bugfix]", notes "Use ISO week numbering") changes uk `week.doy` 7 → 4. A locale default value; kept as its own entry because it changes week arithmetic, not a string.
- `locale-month-names-changed`: #6197 (id), #6410 (pl), #6306 (ca). The id PR also adds parse patterns so 'Agt' still parses; noted in the summary.
- `locale-weekday-names-changed`: #6289 (sv, PR titled "[bugfix]"), #6370 (uk apostrophe).
- `locale-l-date-format-changed`: #6217 (ka, nl-be).
- `locale-calendar-strings-changed`: #5404 (pt-br), #6347 and the calendar half of #6391 (sw).
- `locale-relative-time-changed`: #6371 (hu, PR titled "[bugfix]", a ternary-precedence bug that dropped the number), #6409 (uz, uz-latn), the relative-time half of #6391 (sw). The hu one is the most fix-like of all; included for consistency with the section rule.
- `de-short-months-parse-without-dot`: #6396. Parsing now accepts more input (before, 'Feb' silently parsed as January). Fix-like and closer to "malformed input" than the rest; included because it is under "Updates to existing locales".

## Judgment calls, left out

- Security fix GHSA-4p3w-j4w9-5jqw (`moment.locale()` with a crafted non-string value could load a file from an attacker path): a security fix; string input is unaffected.
- Every "Bug fixes" bullet: #6376 (prototype properties as format tokens), #6386 (lazy-loaded locale name normalisation), #6404 (`eHHmm` parsing), #6433 (`moment.min`/`max` ignore non-Moment arguments, a behavior change but filed and worded as a fix), #6434, #6436, #6437, #6442, #6443, #6446 (range check on parsed zone offsets), #6447 (metadata in the all-locales bundle), #6448 (postformat applied to locale relative-time functions), #6450 (stack traces in conditional deprecation warnings, logging).
- New features: #6451 internal date-default hook for Moment Timezone; new locales `ps` and `am-et` (new, so no existing behavior changes).
- `package.json` gains a `files` list (the published tarball loses repo-only files such as tests and build scripts); `src/lib/` and `src/locale/` stay published, no `exports` map, so no import path an app uses goes away. Not listed.
