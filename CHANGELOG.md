# Changelog

## 0.4.0

This is the build tested in the blind held-out v4 benchmark ([results](bench/heldout-v4/RESULTS-claude-sonnet-5-5.md)): 66 tasks from changes released after June 2026, with `claude-sonnet-5-5` and `claude-sonnet-4-5`. On `claude-sonnet-5-5`, agents with stalemap passed 89% of sessions, against 68% with no help and 73% with a plain `tsc --noEmit` hook. Both comparisons were pre-registered, and both were wins.

- **The guard reports everything the compiler does.** After every code edit it runs the project's own `tsc` and lists all its errors: first the ones a changed dependency explains, with stalemap's note; then the others, without claiming a dependency changed; then new errors in files that import the edited one, and up to five elsewhere. A plain type-check hook is now a subset of the guard. `STALEMAP_GUARD_TSC=0` turns this off.
- **The guard looks up the fix when no note has it.** For an error a changed package explains but no note covers, it searches that package's type changes, release notes and upgrade-guide sections with the error and the code around it. It shows the best match that names an identifier from the error's line as a "Related change", for example the mongoose 9 migration guide's section on pre middleware without `next()`. `STALEMAP_GUARD_SEARCH=0` turns this off.
- **Moved members are caught** when read as a property: `HttpStatusCode.PayloadTooLarge` → `ContentTooLarge` in axios 1.20 still type-checks, and the guard now reports it.
- **Edit-time notes** include release-note items whose wording says what changed ("now only rejects…", "no longer…") when the edited code uses one of their names exactly. Specific names rank above common ones.
- **Better Fix notes:** a note that leads with another function (`literal()`'s options) isn't attached to an error in this one (`z.config`). A type name the error quotes (`'string'`) doesn't pick a note. An error about two compiler options needs a note about both.
- **`search_changes` keeps the fix with the change:**
  - Release-note sections are indexed whole, with their code blocks.
  - Results are capped per section instead of per release, and 8 are returned by default.
  - Stemming joins "intersection" and "intersecting", and `_id` stays whole.
- **More release notes:**
  - A package CHANGELOG that stops before the installed version (axios 1.20.0 ships one that ends at 1.19.0) is completed from GitHub releases.
  - For a terse or "see the PR" release-note item, search also indexes the pull request's description. `STALEMAP_NO_PRS=1` turns this off.

## 0.3.1

Docs only; no change to what stalemap does.

- The npm page's README no longer says the latest release is 0.2.0 or calls 0.3.0's features unreleased.
- README graphics: a banner, a diagram of how it works, and an example of the output.

## 0.3.0

- Docs: comparisons with third-party tools are withdrawn from the README and the benchmark results pending permission. The 0.2.0 README's claim that stalemap beat a docs tool in one-shot mode doesn't hold: that tool's calls were refused in most of the run's later sessions, which the harness didn't detect.

After the blind held-out v3 run (59 tasks, `claude-sonnet-4-5`, [results](bench/heldout-v3/RESULTS.md)), where the notes and the guard scored 53%, against 43% with no help and 55% with a plain `tsc --noEmit` hook. The changes below are post hoc and haven't been tested on a blind suite.

- **The guard asks the project's own TypeScript.** Compiler-option errors used to be reported only when the project ran the same TypeScript as stalemap, so a TypeScript 7 project got none of TS5101/TS5102/TS5108. Now they come from the project's compiler: its JS API for TypeScript 5 and 6, its `tsc --noEmit -p` for TypeScript 7, whose package has no JS compiler API. Messages keep the compiler's own hint lines ("Use `"paths": {"*": ["./src/*"]}` instead"). After a tsconfig edit, the code errors the new options cause are listed too, and with TypeScript 7 the compiler's errors in the edited file and new ones in files that import it.
- **Guard attribution:** errors are tied to a package through the types involved, so `schema.path("age").doValidate()` and a mongoose hook's `next()` count, and an import of an entry point that no longer resolves (TS2307 on `next/amp`) does too. A message's stray words no longer attribute it: TypeScript's removed compiler API includes `Type`, so every "Type 'x' is not assignable" error used to land on TypeScript.
- **`search_changes`, a lookup on demand** (MCP tool, and `stalemap search <query>`): the agent asks in its own words when it needs to, and gets the matching changes with their sources. It searches every type change of every public entry point, every release-note item, cached upgrade-guide notes and the guides' text in sections, with BM25 over split identifiers, source weights, and boosts for what the project uses and the files the query names. The index is cached per package and version pair, so searches after the first are fast and offline. The server now sends instructions, and the tool description says to search before the first edit even when sure, as docs servers' do. `stalemap mcp --model <id>` (or `$STALEMAP_MODEL`) sets the model for clients that don't pass one.
- Offline, a cached packument is used past its expiry instead of failing.
- **Notes per project.** The block ranks notes by what the workspace uses: imports, members and component props (`<Image quality={90}>`), config keys including nested ones (`experimental.turbo`, `images.qualities`) and option values (`moduleResolution: "node10"`), imported entry points and file names. Release notes that name them get in past the usual cap of six, so projects stop getting the same block: 16 Next tasks got 3 distinct blocks before, 8 now. Every moved config key the project sets is listed instead of being cut at "(+10 more)".
- **Packages used only through config** (TypeScript through `tsconfig.json`) get their option changes first, with the options the project sets named in full, and no list of removed JS API exports.
- **Moved exports:** an export removed from the imported entry point but still exported by another public one is reported as moved and diffed there. TypeScript 7's `CompilerOptions` lives in `typescript/unstable/sync` now, which gives the options it removed (`baseUrl`, `outFile`, `downlevelIteration`, `esModuleInterop`, `alwaysStrict`…) where the report used to say "`CompilerOptions` was removed". Live analysis only; precomputed reports don't store the entry points this needs.
- **Moved nested keys** also come from an old deprecation that named its successor (`experimental.turbo`, "Use `config.turbopack` instead", removed in Next 16).
- **Edit-time notes** about moved config keys need the key itself in the file, and a namespace like `experimental` (many unrelated keys under one object) no longer stands in for its keys.
- **`Fix:` notes name what the error is about**, as code: a TS2353 on the `turbo` key gets the note that moves `experimental.turbo` to `turbopack`, not the one about the `--turbo` CLI flag, and no note at all when none names the key or option.

After the blind held-out v2 run, whose notes named only 1 of the 10 target changes the tasks tested; 7 more were in stalemap's report but below the budget cut. Post hoc, see [bench/heldout-v2/POSTHOC.md](bench/heldout-v2/POSTHOC.md).

- **Config files count as usage.** `tsconfig.json` (TypeScript wasn't checked at all without `--all`), `next.config.*`, the Prisma schema and `prisma.config.ts`, the Vitest, Vite, ESLint, Tailwind, Drizzle, Playwright, Astro, Svelte, Nuxt and Wrangler configs. Options a config sets count as used APIs, so `compilerOptions.baseUrl` makes TypeScript's `baseUrl` deprecation a note about your code. Packages with a known config file are checked only when it or an import exists, so unused ones stop taking budget.
- **`--guides`: notes from upgrade guides** for changes types can't show: defaults, moved config options, file conventions, CLI behavior. Guides are found in each package's repository (or its docs repository), and each major's guide is read separately. A note is kept only if it quotes the guide. They rank by what the project uses, and a changed default is skipped where the project sets the option. The guard reuses cached guide notes for its hints, without model calls.
- **Notes ranked for the guard:** with the post-edit guard on (`--guard`, or detected from the hooks `setup` writes and the Claude Code plugin; the session-start hook always is), the block goes first to changes that still type-check: changed defaults, behavior, settings or schema fields that moved, then explicitly breaking release notes. Removals and renames, which the guard reports when the agent uses them, and deprecations, which still work, come after. `--no-guard` keeps the old order.
- **Edit-time notes:** after an edit, even with no compile error, the guard mentions up to three changes from below the cut that still type-check and whose names the edited text uses: `images: {…}` in `next.config.ts` gets "bump default `images.minimumCacheTTL`…", `datasource db {…}` in `schema.prisma` gets "`datasource.url` is now configured in the config file", `.pick()` gets zod 4.3's new error. Works for the config files above too. Each note shows once per session and not when the notes block already says it.
- **Guard:**
  - TypeScript's own option errors (TS5101 for `baseUrl` in TypeScript 6, TS5090 for `paths`…) are reported after edits to `tsconfig*.json` and code files, when the project runs the same TypeScript as stalemap.
  - Flags `as any`, `@ts-ignore` and `@ts-expect-error` on code that uses an API from the change set: they hide the mismatch the guard is for, and the code still fails at run time.
- **Coverage:**
  - `--all` also diffs entry points nothing imports yet, test helpers included (`ai/test`: `MockLanguageModelV1` → `MockLanguageModelV4`). Precomputed reports store them (shard format 2).
  - A removed export with a higher-versioned sibling names it as the replacement.
  - TypeScript's deprecated compiler options and option values get one note when the project has a `tsconfig.json`.
- Release-note text loses `&nbsp;`, author credits and commit hashes.
- Benchmark harness: `--notes per-task` builds each session's notes from the task's own files, the way `stalemap sync` would in a real project (the default for heldout-v3), and `--notes-only` writes the notes without running sessions. The exploratory `oracle` arm gets a one-line hint naming the target change instead of stalemap's notes.

Closes the gap the held-out benchmark found: Next 16 config keys and file conventions that are deprecated but still type-check.

- **Moved config keys:** nested config types are diffed one level deep. Keys that were deprecated with a named successor, or moved to the top level, become one note per config type, grouped by what replaces them: "`experimental.{ppr, cacheComponents, dynamicIO, useCache}` → `cacheComponents`". Earlier renames come from the changelog.
- **Guard:**
  - Reports moved config keys even though they type-check.
  - Reports renamed file conventions (`middleware.ts` → `proxy.ts`) when the changelog and the types agree.
  - Attributes errors inside config objects to the package that declares their type.
  - Picks the note for the innermost call, so `tool()` errors nested in `generateText()` get `tool()`'s note.
  - Shows each note once per message.
- The changelog reader understands config paths ("rename experimental.dynamicIO to experimental.cacheComponents") and "Deprecate `X` and recommend `Y`".
- Default block budget is 1,800 tokens (was 1,500).
- **`stalemap setup --agent cursor|codex|opencode|claude`:**
  - Writes the notes block where that agent reads it, registers the MCP server and installs the edit-time guard as the agent's post-edit hook.
  - Merges into existing config files: re-runs change nothing, and `--dry-run` shows the plan. A Codex `config.toml` layout it can't merge safely is left alone, with the entry printed to add by hand.
  - Cursor also gets a stop-hook fallback that sends unreported guard findings as a follow-up message, since Cursor doesn't pass hook context to the model yet.
  - Not yet tried in a real Cursor, Codex or OpenCode install.
- Fixed: when the block's model, cutoff or dependency hash changed but the notes didn't, `sync` said "already up to date" and `check` kept failing.
- **Precomputed reports** for fast-moving packages: `scan`, `sync`, the session-start hook and the MCP server fetch the project-independent half of the analysis (trimmed type surfaces and release notes) and replay the diff against your imports, instead of downloading both versions. A cold scan of `test/fixtures/next-ai-app` drops from 28–45 s to 2–5 s, with identical notes. Not hosted yet: used only when `STALEMAP_PRECOMPUTED_URL` points at a set built with `npm run precompute` (from `data/precompute.json`, about 200 packages × current models). `--no-precomputed` or `STALEMAP_NO_PRECOMPUTED=1` turns it off.
- Fixed: the same package version could give different API surfaces, and so different notes, depending on the current directory and the machine. Declarations picked up whatever `@types/node` the current directory had, and imports resolved from any `node_modules` above the cache (such as `~/node_modules`). Extraction now sees only the package and the siblings fetched with it. Node and DOM types stay unresolved everywhere, and file names match case-sensitively. This removes a false "`ReadonlyURLSearchParams`: removed `entries`, `forEach`…" note for Next 16. Cached surfaces are rebuilt (surface format 11), and precomputed reports move to `v1.11/`.

## 0.2.0

Held-out benchmark ([bench/heldout/RESULTS.md](bench/heldout/RESULTS.md), pre-registered, 240 sessions with `claude-sonnet-4-5`): with the notes and the guard, 83% of sessions passed, vs 50% alone. (This entry also compared stalemap with a third-party docs tool; that comparison is withdrawn, see 0.3.0.)

- **Edit-time guard:** `stalemap hook post-edit` (installed by the Claude Code plugin) and `stalemap guard <files>`. After each Write/Edit, it type-checks the file against the installed versions and tells the agent about errors in the APIs of dependencies that changed after its cutoff, with the matching note as the fix. Deprecations are reported only with `STALEMAP_GUARD_DEPRECATIONS=1`.
- **Verified examples:** `--examples` adds a Before → After line to the top notes. Claude writes it (through `claude -p` or the Anthropic API) from the pinned declarations and changelog, and it's kept only if it compiles against the pinned version.
- The SessionStart hook remembers each session's model, so the guard can use it.

## 0.1.1

Tagged on GitHub; never published to npm (its changes ship in 0.2.0).

Sharper notes, from what the first agent benchmark exposed ([bench/RESULTS.md](bench/RESULTS.md)):

- Removed options name their successors: changelog renames (`use maxOutputTokens instead of maxTokens`), plus new options the changelog mentions, with their JSDoc and `@default` (`stopWhen`: "…default `isStepCount(1)`").
- Options required in every member of a union type are reported (`tool()` "now requires `inputSchema`").
- New required parameters show their type (`revalidateTag()` now requires `profile` (`string | CacheLifeConfig`)).
- Removed exports with known successors are merged into one line (`CoreMessage` → `ModelMessage`, `convertToCoreMessages` → `convertToModelMessages`).
- Dependencies the code doesn't import yet (new projects, `--all`) get their changelog-backed breaking changes. Public subpaths are discovered (`next/cache`, `next/server`), mirror entry points like `zod/v4` rank lower, and duplicates across entry points are reported once.
- "replace X with Y" changelog entries count as renames.
- Up to 8 notes per package by default (the token budget still caps the block).
- Fixed: `--json` output was cut off when piped.
- Fixed: `stalemap probe --provider claude-code` now works with a Claude plan.

## 0.1.0

First release: `scan`, `sync`, `check`, `remove`, `models`, `probe`, `mcp` and `hook session-start`; type-declaration and changelog diffs since a model's training cutoff; the Claude Code plugin and the GitHub Action.
