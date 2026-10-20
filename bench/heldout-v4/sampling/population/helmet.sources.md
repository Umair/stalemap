# helmet: sources and judgment calls

Package `helmet`, pinned **8.3.0**. No v3 population for helmet.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (`npm view helmet time`): **8.3.0** only (npm 2026-07-12T01:20Z; the changelog heading says 2026-07-11, the US-time date). No major in the window, so no migration guide.

## Sources consulted

| source | entries |
|---|---|
| https://github.com/helmetjs/helmet/blob/main/CHANGELOG.md (8.3.0 section, "Changed" and "Fixed") | 2 |
| `gh api repos/helmetjs/helmet/releases` | 0 (helmet publishes no GitHub releases) |
| Commits 5628ff2c ("CSP: improve error handling for invalid directive names") and 80338af2 ("CSP: disabling defaults with no directives is now an error"), read to word the summaries | 0 new |
| `npm pack` diff 8.2.0 → 8.3.0 (under `bench/.work/research/helmet/`) | 0 new |

Total: 2 entries, 1 `breaking`, 1 `default-behavior`.

## Judgment calls

Included:
- `csp-strict-directive-names` (default-behavior): listed under "Changed" as "improved error handling for invalid directive names". The commit tightens the name check from "only `[a-zA-Z0-9-]`" to "starts with a lowercase letter, doesn't end with a hyphen", and its tests add `DefaultSrc`, `Default-Src`, `-default-src`, `default-src-` as now-invalid. Same input, now throws, under a "Changed" heading. This is the entry that qualifies helmet; it is thin (it only affects oddly cased or hyphenated names), so it is worth a second look.
- `csp-usedefaults-false-requires-directives` (breaking): listed under "Fixed", but it changes the public `ContentSecurityPolicyOptions` type (`useDefaults: false` now requires `directives`) and changes the default of `directives` from the default directive set to `{}`, so `contentSecurityPolicy({ useDefaults: false })` now throws where it used to emit the default policy. A public signature change makes it `breaking` under PROTOCOL.md even outside a "Breaking" heading; it also changes a default. Typed `breaking`; `default-behavior` would be defensible.

Left out:
- "Fixed": dynamically computed directive values (and value functions that throw) now go to `next(err)` instead of throwing synchronously. Bug fixes, not presented as changes.
- "Changed": ~7% faster CSP when no directives are dynamic. Performance.
- Not in the notes: the exported option types became `type` aliases instead of `interface`s (commit 7c644363, shipped in 8.3.0), which stops declaration merging into them. The changelog doesn't mention it; population entries come from the notes, so it is not listed. Worth a second look.
