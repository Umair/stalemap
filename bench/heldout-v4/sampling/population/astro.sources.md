# astro: population sources

Package `astro` (repo withastro/astro), pinned at **7.4.1**. 8 entries (3 breaking, 1 deprecation, 4 default-behavior). No v3 population exists for this package.

## Versions in the window

34 stable versions, 7.0.5 (2026-07-01) through 7.4.1 (2026-10-19). Minors: 7.1.0, 7.2.0, 7.3.0, 7.4.0. No major in the window (7.0.0 predates it).

## Sources consulted

- `packages/astro/CHANGELOG.md` (main), sections 7.0.5–7.4.1 read in full (≈1,250 lines).
- GitHub releases `astro@7.x` (`gh api repos/withastro/astro/releases --paginate`): changesets-generated, identical to the changelog sections.
- PRs #18099, #15595, #17837 and commit 1d9e910 for detail; `npm view astro@7.0.4/7.4.1` for the sharp range; `npm pack astro@7.0.4` to confirm `setPrerenderer` and the `AppPipeline` export existed before the window.

Entries by source: changelog 8.

## Judgment calls (included with doubt)

- `7.1.2/cookie-v2-no-percent-encoding`: a dependency bump, but the note states the observable change to `Set-Cookie` output.
- `7.2.3/app-pipeline-removed`: the removed export was undocumented/internal, but it is a public subpath export.
- `7.2.5/add-module-import-not-preserved`: part of a fix, but it changes what the public `addModuleImport()` store API keeps.
- `7.3.2/mdx-dynamic-script-style-escaped`: a security fix that changes rendered output and documents a migration (`set:html`).
- `7.3.6/checkorigin-sec-fetch-site`: "Improves CSRF protection"; the check's inputs change, so requests can be accepted/rejected differently.
- `7.2.8/sharp-min-0-35-4`: sharp is an optional dependency, not a peer; treated as a raised minimum.

## Left out

- 7.4.0 separate `build`/`runtime` image services: a new opt-in shape; the integration-facing notes only apply to projects using it.
- 7.3.6 YAML switch (#18099, "Adds YAML parsing with timestamp and merge key support"): presented as an addition after a parser swap; whether earlier 7.x parsed timestamps differently is unclear from the notes.
- 7.3.6 Host header validated against `security.allowedDomains` for the Node app (1d9e910), session id UUID validation (7.2.5), over-encoded path rejection, `checkOrigin` JSON fix, actions 400/404 for malformed input: security fixes / fixes.
- 7.3.4 error `name` corrections (`MissingLocale` etc.), base-path boundary fix, `pages*` directory fix, `reference()` error logging: fixes.
- 7.3.0 logger routing, 7.3.8 esbuild→Oxc/Rolldown internals, 7.2.5 deprecation messages retargeted to Astro 8, CLI/agent foreground behavior, dev-only CSS class hashing: logging, internals, CLI, dev.
- Changes to `experimental.incrementalBuild`, `experimental.collectionStorage`, parallel prerendering, `astro/fetch` `notFound()`, `--timings`, `--ignore-lock`, `--background`, `session: false`, `deferRender`, CSP `kind`, `paginate` `format()`: new features or features added inside the window.
- 7.2.7 Cloudflare `compatibility_date`/Wrangler requirement: concerns generated Cloudflare config, not the `astro` API.
