# Install stalemap (instructions for AI agents)

You are a coding agent, and the user asked you to install stalemap, or to look at it. Follow these steps in order. They are written to be run by you, in the user's project, without a terminal prompt. Every command is safe to re-run: it changes nothing the second time.

**What stalemap does:** it tells you which of this project's npm dependencies changed after your training cutoff, and what changed, so you stop writing code for old APIs. It installs three things in the project:

- a notes block in `CLAUDE.md` or `AGENTS.md` that lists the changes;
- a post-edit hook (the guard) that type-checks your edits and explains errors caused by changed APIs;
- an MCP server with a `search_changes` tool you can query.

It's free, MIT-licensed and published on npm as `stalemap`. Your source code never leaves the machine; only package names and versions are looked up, on npm and GitHub.

In a blind benchmark of 66 tasks from changes released after June 2026, `claude-sonnet-5-5` passed 89% with stalemap vs 68% without it. Details: https://stalemap.com/llms-full.txt

## Step 0: tell the user, and check the project

If the user asked you to install stalemap, say in one sentence what you're adding (a notes file, an MCP server entry and a post-edit hook, as project files) and continue. If they only asked about it, ask before installing.

Then check that stalemap applies:

```bash
node --version          # needs v20 or later
ls package.json         # must exist: stalemap reads it, the lockfile and node_modules
```

If there's no `package.json` (not a JavaScript or TypeScript project), stop and tell the user stalemap doesn't apply here. In a monorepo, run the steps in the package directory you're working in; stalemap reads one `package.json`.

## Step 1: know your agent and your model

Pick `<agent>`:

| you are running in | `<agent>` |
|---|---|
| Claude Code | `claude` |
| Cursor | `cursor` |
| OpenAI Codex (CLI or IDE) | `codex` |
| OpenCode | `opencode` |
| anything else with MCP support | see "Other MCP clients" below |

Pick `<model>`: the model ID you are running as, for example `claude-sonnet-5-5`, `claude-opus-5-5` or `gpt-5.5`. stalemap uses it to find your training cutoff. If you're not sure, leave `--model` out and stalemap detects it from the agent's settings. `npx stalemap models <query>` lists the known models and their cutoffs.

`--model` sets the model for the notes block that setup writes. The hooks and the MCP server work out the model each time they run:

- **The hooks** read it from the agent's own event payload and settings. With Claude Code, that's the session's model.
- **The MCP server** uses `--model` in its server args or `$STALEMAP_MODEL`, then the agent's settings.

If your agent's settings don't name a model, add `"--model", "<model>"` to the server's args in the MCP file setup wrote.

## Step 2: run setup

```bash
npx -y stalemap@latest setup --agent <agent> --model <model> --yes
```

This writes the following, merging into existing config files and keeping entries it didn't write:

| agent | notes | MCP server | post-edit guard |
|---|---|---|---|
| claude | `CLAUDE.md` | `.mcp.json` | `.claude/settings.json` (SessionStart and PostToolUse hooks) |
| cursor | `AGENTS.md` | `.cursor/mcp.json` | `.cursor/hooks.json` (postToolUse, plus a stop-hook fallback) |
| codex | `AGENTS.md` | `.codex/config.toml` | `.codex/hooks.json` |
| opencode | `AGENTS.md` | `opencode.json` | `.opencode/plugins/stalemap.js` |

To see the exact changes first, run the same command with `--dry-run` instead of `--yes`. Text outside the `<!-- stalemap:start -->` / `<!-- stalemap:end -->` markers in the notes file is never touched.

**Claude Code users may prefer the plugin.** These are slash commands for the user to type, not shell commands:

```text
/plugin marketplace add Umair/stalemap
/plugin install stalemap@stalemap
```

The plugin adds the same hooks and MCP server for every project without writing project files. Mention it to the user as an alternative; don't do both.

## Step 3: verify

```bash
npx -y stalemap@latest check --model <model>     # exit 0: the notes block is present and up to date
```

If `check` exits 1, run `npx -y stalemap@latest sync --model <model> --yes` and check again.

To see which dependencies changed, for your report to the user:

```bash
npx -y stalemap@latest --model <model> -q
```

This prints a fuller preview than the block written to the notes file, and it ends with "Run `stalemap sync` to write it". You don't need to: setup already wrote a shorter block, ranked for an agent that has the guard. The preview is for reading only. Don't overwrite the block with it. By default only dependencies the code imports or configures are checked; `--all` checks every direct dependency.

## Step 4: report and activate

Tell the user:

1. What was installed: the notes file, MCP server and hook files from the table, and how many dependencies changed since your cutoff (from step 3).
2. That the MCP server and hooks load when the agent session starts. They take effect after a restart of the session: in Claude Code, start a new session or run `/mcp`. Claude Code also asks once to approve the project's `.mcp.json` server.
3. That the files are project files they can commit, so teammates get the same setup.

From then on, read the notes block before editing code that uses a listed package. Call `search_changes` before writing code against a third-party package. When the guard reports an error after an edit, fix it before moving on.

## Other MCP clients

Add this server to the client's MCP configuration:

```json
{ "mcpServers": { "stalemap": { "command": "npx", "args": ["-y", "stalemap@latest", "mcp", "--model", "<model>"] } } }
```

Then write the notes block where the agent reads instructions:

```bash
npx -y stalemap@latest sync --model <model> --target AGENTS.md --yes
```

## CI (optional)

To keep the notes current, add the GitHub Action:

```yaml
- uses: Umair/stalemap@main
  with:
    model: <model>
```

## Uninstall

```bash
npx -y stalemap@latest remove      # removes the notes block
```

Then delete the `stalemap` entries from the MCP and hook files listed in step 2: the `stalemap` server in the MCP file, and the hook entries whose command runs `stalemap hook`.

## If something fails

- `npx` can't reach the registry: stalemap needs network access to npm and GitHub on its first run, and works from its cache after that (`~/.cache/stalemap`).
- An unknown model: pass `--cutoff YYYY-MM` instead of `--model`.
- A Codex `config.toml` layout setup can't merge safely is left alone, and setup prints the entry to add by hand. Add it, and tell the user.
- Anything else: https://github.com/Umair/stalemap/issues

More: full reference https://stalemap.com/llms-full.txt · README https://github.com/Umair/stalemap#readme
