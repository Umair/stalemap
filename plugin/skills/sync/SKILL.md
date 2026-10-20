---
description: Write or refresh the stalemap block in AGENTS.md or CLAUDE.md, listing dependencies that changed after the model's training cutoff.
argument-hint: "[--target CLAUDE.md] [--all] [--llm]"
disable-model-invocation: true
---

Run this from the project root:

```bash
npx -y stalemap@0.4.1 sync --yes $ARGUMENTS
```

Then tell the user, in two or three lines:
- which file was written or updated (or that it was already up to date),
- the packages with notes and their version jumps,
- the most important note.

If the command fails because there is no `package.json`, say this command only works in JavaScript or TypeScript projects. Don't edit the block by hand: it is regenerated on every sync.
