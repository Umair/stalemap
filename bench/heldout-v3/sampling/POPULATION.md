# How the population was built

The rules are in [../PROTOCOL.md](../PROTOCOL.md#population-every-change-in-the-window). This file is the procedure each package's researcher followed, so the population can be checked or rebuilt.

## Per package

1. **Versions.** List every stable version (no prerelease tag) published after 2025-07-31 and on or before 2026-10-15, up to the version the template pins, from the npm registry's `time` field. Backports to older lines count only if they changed something the newest line didn't (rare; say so).
2. **Sources,** all of them, for those versions:
   - the GitHub release notes for each version (`gh api repos/<owner>/<repo>/releases --paginate`, stable releases in the window);
   - the changelog file in the repository or the published package (`CHANGELOG.md`, `changelog.md`, `HISTORY.md`, `packages/<name>/CHANGELOG.md` in monorepos);
   - for every major release in the window (a new minor line below 1.0), the official migration or upgrade guide and the release blog post.
3. **Extract** every entry that meets the rules: a breaking change, a deprecation, or a default/behavior change. Leave out bug fixes (unless marked breaking or changing a default), features that leave existing behavior alone, performance, docs, tests, chores, and dependency bumps not marked breaking. Leave out changes to APIs that were themselves added inside the window. When unsure, include the entry and say why in the sources file: the walk can still skip it, and an excluded entry can never be drawn.
4. **One change per entry.** Merge descriptions of the same change from several sources (the changelog bullet and the migration-guide section) into one entry, dated at the first stable release in the window that shipped it. Split a bullet that bundles unrelated changes. Several changes of the same kind to items of the same kind in one release (icons renamed, aliases removed, options removed) are one entry for that release, listing the items in the summary.
5. **Write** one JSON object per line to `population/<package>.jsonl` (scoped names with `__` for `/`):

   ```json
   {"id":"example-lib@3.0.0/connect-returns-promise","package":"example-lib","version":"3.0.0","date":"2026-01-15","type":"breaking","summary":"connect() returns a promise instead of taking a callback","source":"https://github.com/example/example-lib/releases/tag/v3.0.0"}
   ```

   - `id`: `<package>@<version>/<slug>`, the slug short, lowercase, unique within the package;
   - `type`: `breaking`, `deprecation` or `default-behavior` (a change that is both breaking and a removal of something deprecated earlier is `breaking`);
   - `summary`: one line in your own words (don't paste the notes), naming the old and the new behavior where there is one;
   - `source`: the most specific URL (a release, a changelog anchor or a guide section).
6. **Record** what was consulted in `population/<package>.sources.md`: the version range, every source URL, how many entries came from each, and every judgment call (included or left out, and why).

Researchers did not decide whether a change could become a task; that happens later, in draw order, under the skip criteria.
