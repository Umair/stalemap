# Brief for the population researchers

Each category of the frame was researched by one agent with this brief plus its category's candidate list (from `frame.json`, in rank order). Kept here so the population can be rebuilt the same way.

## Blindness (hard rules)

Never run stalemap. Never read anything in `src/` or `dist/`, `bench/results/**`, any `stalemap-notes*.md`, `bench/arms/stalemap*.md`, `examples/`, any `RESULTS.md` or `POSTHOC.md`, anything under `~/.claude`, `bench/.work/notes-*`, or other sessions' transcripts or notes. You may read `bench/heldout-v4/**`, `bench/heldout-v3/**` (except any RESULTS/POSTHOC file) and the public web/npm/GitHub.

## Your job

Work in `bench/heldout-v4/sampling/` of the worktree `/Users/umair/Projects/stalemap/.claude/worktrees/heldout-v4`. Read `../PROTOCOL.md` ("Sampling": frame, window, population rules) and `POPULATION.md` (the per-package procedure) first.

**A. Qualifying.** Walk your category's candidates in rank order. A package qualifies if it has TypeScript types (all candidates listed do, unless marked) and at least one change in the window (stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version given) that meets the population rules (breaking, deprecation or default/behavior change, as PROTOCOL.md defines them). A release in the window that opens a new semver-major line (marked "major") qualifies the package without reading notes. A package with 0 releases in the window doesn't qualify. For the others, read the release notes / changelog of the in-window releases until you find one qualifying entry or run out. Stop once **4** packages qualify (or the list ends). Write `qualifying/<category-slug>.md`: one row per package examined, in rank order: package, pinned version, verdict (qualifies / doesn't), and the reason (the release and entry that qualify it, or "no release in the window", or "releases X–Y: only fixes and features").

**B. Population.** For the **top 3** qualifying packages only (not the 4th), build `population/<package>.jsonl` and `population/<package>.sources.md` exactly as `POPULATION.md` says (scoped names use `__` for `/`). Every stable version after 2026-06-30 and on or before 2026-10-19, up to the pinned version. All sources: GitHub releases (`gh api repos/<owner>/<repo>/releases --paginate`), the changelog file, and for each major release in the window the official migration/upgrade guide. Include every breaking, deprecation and default/behavior entry; when unsure, include it and say why in sources.md. One change per entry, dated at the first stable release in the window that shipped it. A change first shipped in a stable release before 2026-07-01 is not in the window, even if a later note mentions it again.

If `bench/heldout-v3/sampling/population/<package>.jsonl` exists, v3 already covered this package through 2026-10-15 with a different window. Reuse v3's `id` (and you may reuse its summary) for any entry that is the same change and whose first stable release is in the v4 window, so earlier suites' spent changes match by id; still check every in-window release yourself, including releases after 2026-10-15, and drop v3 entries dated before 2026-07-01.

Don't decide whether a change could become a task, and don't write tasks. Don't edit any file outside `sampling/qualifying/` and `sampling/population/`. Don't commit. Scratch downloads (npm pack tarballs, cloned changelogs) go under `bench/.work/research/<package>/`, never into the template.

## Report

End with: the qualifying order (top 4), the number of entries per package built, and every judgment call worth a second look.
