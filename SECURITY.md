# Security

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately through GitHub: on the repository's **Security** tab, choose **Report a vulnerability** ([direct link](https://github.com/Umair/stalemap/security/advisories/new)).

Include what you found, how to reproduce it and which version or commit is affected. You should get a reply within a week. Fixes are released on npm and noted in the [changelog](CHANGELOG.md).

## Scope

stalemap downloads package metadata, type declarations and release notes, runs the TypeScript compiler on them, and installs hooks that run after an agent's edits. Problems that matter most here:

- code execution or file writes outside the project and stalemap's cache, caused by a package, changelog or config file it reads;
- hook or MCP behavior that leaks project files or credentials (stalemap never uploads your source code; see "What leaves your machine" in the [README](README.md));
- `setup` writing agent config that runs something other than stalemap.

Supported versions: the latest npm release.
