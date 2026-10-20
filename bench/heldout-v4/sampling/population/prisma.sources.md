# prisma (family: prisma, @prisma/client): sources and judgment calls

Built 2026-10-20 following [../POPULATION.md](../POPULATION.md). Repo: prisma/prisma (now redirecting to prisma/orm). Pinned version: **7.10.1** for both packages. Both packages share one release train and one set of notes, so they are in one file; each entry's `package` names the package the change lives in (`prisma` for the CLI, Studio and config; `@prisma/client` for the client runtime).

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`, identical for both packages): **7.9.0** (2026-07-20), **7.9.1** (2026-07-27), **7.10.0** (2026-08-25), **7.10.1** (2026-10-15; its GitHub release is dated 2026-10-19). No major in the window. Dates in the population are npm publish dates.

## Sources consulted

| Source | URL | Entries |
|---|---|---|
| GitHub release 7.9.0 | https://github.com/prisma/prisma/releases/tag/7.9.0 | 6 |
| GitHub release 7.9.1 (security advisory in a transitive dependency only) | https://github.com/prisma/prisma/releases/tag/7.9.1 | 0 |
| GitHub release 7.10.0 | https://github.com/prisma/prisma/releases/tag/7.10.0 | 9 |
| GitHub release 7.10.1 | https://github.com/prisma/prisma/releases/tag/7.10.1 | 0 |
| Changelog file | none for 7.x: the repo's root CHANGELOG.md now tracks Prisma 8 prereleases only; branches 7.0.x–7.9.x have no changelog; the npm tarballs of prisma@7.10.1 and @prisma/client@7.10.1 ship none | 0 |
| Migration guide | none (no major in the window) | 0 |

PRs read only to confirm or describe entries: #29684, #29689, #29691, #29713, #29701, #29718, #29771, #29949, #29969, #29994, #30000, #30002. The built `prisma@7.10.1` CLI was grepped to confirm the plain `prisma` binary (not only `prisma7`) scaffolds `prisma7.config.ts` and lists it as the default config path.

## Entries per release

- 7.9.0: 6 (1 breaking, 5 default-behavior), all `prisma`
- 7.10.0: 9 (all default-behavior; 6 `prisma`, 3 `@prisma/client`)

Total 15.

## Judgment calls

### Splits

- 7.9.0's "A safer default around destructive commands" bundles three changes from three PRs (agent detection broadened #29684, `db push --accept-data-loss` guarded #29713, MCP `migrate-reset` removed #29691); split into three entries. The 7.10.0 extension to interactive `db push` (#29793) is a fourth, separate entry.
- 7.10.0's config change is two entries: lookup order (`prisma7.config.*` before `prisma.config.*`) and `prisma init` writing `prisma7.config.ts`.

### Included although unsure

- `mcp-migrate-reset-tool-removed`: typed breaking as removal of a public CLI surface (an MCP tool); it is in the "Highlights", not a fix list.
- `windows-engine-cache-user-dir`: listed under "Bug Fixes", but it changes a default location (the rule counts default-value changes in any section).
- `studio-sql-uses-selected-schema`: Studio UI behavior; presented as a change under "Prisma Studio", not as a fix.
- `global-cli-version-mismatch-warning` and `generate-offers-skills-install`: new output/prompts from an existing command; included as behavior changes of `prisma generate`.
- `chunked-statements-transactional`, `raw-invalid-date-validation-error`, `bytes-own-arraybuffer`: in the 7.10.0 "Prisma Client" list (which mixes "Fixed …" bullets with plain change statements); these three are phrased as changes, not "Fixed …", though their PRs are titled `fix(...)`.

### Left out, and why

- 7.9.0 "Bug Fixes": `$queryRaw`/`$executeRaw` fail fast on an invalid `Date` instead of binding `null` (#29697; the 7.10.0 error-class entry above is separate); `XOR` type rejects primitives (#29735); unmapped driver-adapter errors surface as `P2039` (#29512); interactive-transaction `maxWait` rollback; doc-comment escaping; `migrate status` reporting rolled-back migrations as unapplied; PK-rename SQL; symlink-cycle hang. Also "Security": credentials file mode `0o600`/`0o700` (hardening), dependency advisories.
- 7.9.0 features: shell tab completions, Studio migrations view and Streams browser.
- 7.10.0 "Fixed …" bullets: batched `findUniqueOrThrow` P2025, nested-write `P2002` model name, cross-realm Date/Uint8Array, `moduleFormat` inference (defaults to CommonJS when no `type`; presented as a fix), remote-executor logging context, transaction cleanup.
- 7.10.0 additive features: `@prisma/prisma7` package and `prisma7` binary; result-extension `compute(data, modelName)` second argument; OpenTelemetry span context; `prisma version` package path; corrupt command-state tolerance; empty-schema error message; sqlserver Studio message.
- **Driver-adapter changes** (separate packages `@prisma/adapter-*`, not in the frame family): adapter-pg/neon/ppg deadlock `40P01` → `P2034`, `23001` → `P2003`, `P2002` constraint names; adapter-better-sqlite3 typed errors and `SQLITE_BUSY` → timeout; adapter-mariadb external pool, IPv6, 7.10.1 `mariadb` 3.5.4 bump; adapter-mssql VarBinary null; 7.9.0 `postgres-bytea` DEP0005. Worth a second look: the error-code remapping is visible through `@prisma/client`'s `PrismaClientKnownRequestError.code`, but the code lives in the adapter packages.
- 7.10.1: nested `$transaction` no longer mutating its options (fix); Migrate refusing a shadow DB equal to the main DB with `P3025` (listed under "Fixes"); dependency updates.
- Performance (7.10.0 query-plan evaluation, stack-overflow fixes, fluent map), dependency advisories.
