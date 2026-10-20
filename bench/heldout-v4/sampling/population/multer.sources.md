# multer: sources and judgment calls

Package `multer`, pinned **2.4.0**. No v3 population for multer.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (`npm view multer time`):

| version | published |
|---|---|
| 2.3.0 | 2026-08-28 |
| 2.4.0 | 2026-09-14 |

(2.2.0, 2026-06-15, and the prerelease 3.0.0-alpha.2 are outside the window or not stable.) No major in the window, so no migration guide.

## Sources consulted

| source | entries |
|---|---|
| https://github.com/expressjs/multer/releases/tag/v2.3.0 | 3 (same items as the changelog) |
| https://github.com/expressjs/multer/releases/tag/v2.4.0 | 5 (same items as the changelog) |
| https://github.com/expressjs/multer/blob/main/CHANGELOG.md (sections 2.4.0, 2.3.0) | the 8 entries, cited by anchor |
| Advisories GHSA-wc9g-mqfw-jrwm, GHSA-qfvm-cv95-jqjf, GHSA-qvfw-j98x-7q72, GHSA-535w-7cp7-47q4 (2.3.0), GHSA-3pph-fpjx-jg34 (2.4.0) | 0 (security fixes) |
| `npm pack` diffs 2.2.0 → 2.3.0 → 2.4.0 (under `bench/.work/research/multer/`), read only to word summaries accurately | 0 |

Total: 8 entries, all `default-behavior`. The changelog has no Fixed/Changed sections, so every behavior change had to be judged on its wording; the GitHub release lists PR titles with `fix:`/`feat:` prefixes.

## Judgment calls, 2.3.0

Included:
- `file-size-limit-inclusive`: PR #1407 is titled `fix:`, but it changes which uploads are accepted at a configured limit, and the changelog states it as a plain behavior ("Accept files whose size is exactly `limits.fileSize`"). Unsure; included. Its 2.4.0 twin for `parts` carries an explicit migration note, which supports treating these as behavior changes.
- `originalname-decodes-escapes`: `file.originalname` values change for the same request. 2.4.0's changelog refers back to it as the behavior "since 2.3.0" and gives migration advice for the field-name equivalent.
- `next-preserves-async-context`: PR #1124 is `fix:`; the changelog says "Preserve the caller's async context". Downstream handlers now see AsyncLocalStorage stores they didn't before. Unsure; included.

Left out:
- Four CVE fixes: crafted field names crashing the process (now a `MulterError` `INVALID_FIELD_NAME`), descriptor leak on aborted disk uploads, async `fileFilter` bypassing `fileSize`, oversized array index DoS. Security fixes, no default change. The new `INVALID_FIELD_NAME` and `STREAM_DESTROYED` codes are how those fixes report errors (crash/hang → error), so they count as fixes too.
- Opt-in `limits.fieldArrayIndexLimit`: new feature, off by default.
- `fileFilter` calling back twice no longer crashes: bug fix.
- Fallback message for unmapped `MulterError` codes: bug fix.
- Docs, translations, CI, tests, `package.json` normalization.

## Judgment calls, 2.4.0

Included:
- `fieldname-decodes-escapes`: field names decoded like file names; the changelog tells users who matched the escaped spelling to switch.
- `limits-validated-at-construction`: changelog "Reject non-integer or negative `limits` values at construction time". Previously accepted values now throw a `TypeError` (`validate-limits.js` accepts only non-negative integers or `Infinity`), the same kind of change as express's `body-parser-invalid-limit-throws`. PRs #1395/#1335 are `fix:`; included.
- `parts-limit-inclusive`: explicit migration note ("you can drop the extra one").
- `filefilter-rejects-free-maxcount`: PR #1426 is `fix:`, but more files are accepted for the same request and configuration. Unsure; included.
- `unexpected-file-message`: an error message string change; included because the changelog lists it as a change. The walk may find it S6.

Left out:
- `err.filename` on `LIMIT_FILE_SIZE` / `LIMIT_UNEXPECTED_FILE` errors, and the follow-up reporting the decoded filename there: `filename` was added in 2.4.0 itself (inside the window).
- `limits` as a function, opt-in `DiskStorage` `flush`, busboy `defCharset`/`highWaterMark`/`fileHwm` options, `streamHandler`: new features, existing behavior unchanged.
- `multer.diskStorage()` without options no longer throws (#1471, `feat:`): a relaxation where the old behavior was an incidental TypeError. Left out, unlike express's comparable `render-null-options` (which v3 included because express listed it under "Improvements"). Worth a second look.
- CVE-2026-88932 (orphaned files on aborted disk uploads): security fix.
- Removing the `concat-stream` dependency, JSDoc, docs, macOS CI.
