---
description: Check what changed in an npm package since your training data before using or upgrading it. Use when writing code against a package version newer than you know, when upgrading a dependency, or when TypeScript reports a missing export, an unknown option or a wrong argument count for a library API.
---

Your knowledge of a library's API stops at your training cutoff. Before you write or fix code that uses a package that may be newer than that:

1. Call the `search_changes` tool from the stalemap MCP server with what you are about to do, in your own words (old API names are fine), and `package` if you know which one. It searches the installed versions' type changes, release notes and upgrade guides.
2. For a whole package's changes, call `package_changes` with `name`, the pinned `version` (from `package.json` or the lockfile) and, in `apis`, the exports you are about to use.
3. Follow what they say over your memory: they come from the package's published type declarations, changelog and upgrade guides for the installed version.

When upgrading a dependency, call `package_changes` with the target version first, then update call sites for every removed, renamed or changed API it lists. Run the type checker afterwards.

If the tool isn't available, run `npx -y stalemap@0.4.1 scan` in the project root and read the block it prints.
