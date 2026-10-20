# stalemap for Claude Code

Tells Claude which of your project's npm dependencies changed after its training cutoff, and what changed, so it stops writing code for old APIs (`maxSteps` in AI SDK 7, `required_error` in zod 4, `middleware.ts` in Next 16).

## What the plugin adds

- **SessionStart hook:** puts a short, ranked list of the changes into Claude's context for the session's model, on startup, after `/clear` and after compaction. It writes no files.
- **PostToolUse hook** (after Write and Edit): runs your project's own `tsc` on the edit. It reports errors caused by APIs that changed after the cutoff, with the fix. It also reports moved config keys and renamed files that still compile.
- **MCP server** with `search_changes`, `package_changes`, `project_changes` and `check_notes`. Claude can look up what changed in its own words.
- **Skills:** `/stalemap:sync` writes the notes block into `CLAUDE.md`. `upgrade` looks up a package's changes before using or upgrading it.

Every component runs `npx -y stalemap@<version>`, pinned to this release of the [stalemap](https://www.npmjs.com/package/stalemap) npm package (MIT).

## What data it sends

- Your source code never leaves your machine. The import scan is local.
- To find what changed, stalemap sends **package names and versions** to the npm registry, GitHub (changelogs, releases, pull requests) and models.dev (model training cutoffs). It uses `GITHUB_TOKEN` or your `gh` login when available, for a higher rate limit.
- stalemap runs no server of its own and collects no telemetry. Caches stay in `~/.cache/stalemap`.

## Evidence

The suite: 66 tasks, blind and pre-registered, built from changes released after June 2026 and graded by hidden tests.

Results with `claude-sonnet-5-5`:

| setup | passed |
|---|---|
| stalemap | 89% |
| no help | 68% |
| a plain `tsc` hook | 73% |

Details: https://stalemap.com · https://github.com/Umair/stalemap/tree/main/bench/heldout-v4

## Requirements

Node.js 20 or later, and a JavaScript or TypeScript project with a `package.json`.

## Support

Issues: https://github.com/Umair/stalemap/issues · License: MIT
