# nodemailer: sources and judgment calls

Package `nodemailer` (repo `nodemailer/nodemailer`). Pinned version **10.1.7**. Category: utilities. Types: bundled from 10.0.0 (before that, `@types/nodemailer`).

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19, from `npm view nodemailer time --json` (UTC). No prereleases. 9.0.3 (2026-06-30T08:46Z) is the last version before the window. 30 versions:

9.0.4 (08-04), 9.0.5 (08-07), 9.0.6 (08-27), 9.1.0 (08-31), 9.1.1 (09-01), **10.0.0 (09-04)**, 10.0.1 (09-07), 10.0.2 (09-09), 10.0.3 (09-10), 10.0.4–10.0.8 (09-11), 10.0.9 (09-12), 10.0.10 (09-14), 10.0.11 (09-27), 10.0.12 (09-28), 10.0.13 (09-30), 10.0.14 (10-03), 10.0.15 (10-05), 10.0.16 (10-07), 10.1.0 (10-10), 10.1.1 (10-14), 10.1.2 (10-16), 10.1.3–10.1.7 (10-18).

Dates in the jsonl are npm publish dates (10.0.0's changelog heading says 2026-09-03; npm says 2026-09-04).

## Sources consulted

| source | entries |
|---|---|
| https://registry.npmjs.org/nodemailer (`time` field) | 0 |
| GitHub releases, `gh api repos/nodemailer/nodemailer/releases --paginate`, v9.0.4 … v10.1.7 (release-please; same bullets as the changelog) | see below |
| https://github.com/nodemailer/nodemailer/blob/v10.1.7/CHANGELOG.md, sections 9.0.4 to 10.1.7 | 2 directly (10.0.0 breaking, 9.1.0 feature) |
| The full commit message of every commit the changelog links for those versions (110 commits, `gh api repos/nodemailer/nodemailer/commits/<sha>`). The changelog bullets are commit subjects; the commit bodies spell out defaults and "Behaviour changes" that the one-line bullets do not | 21 |
| Migration guide for 10.0.0: none. No upgrade/migration page on https://nodemailer.com (sitemap and nav checked; /upgrade, /migration, /upgrading are 404), no guide file in the repo at v10.1.7, no release post beyond the release notes. The 10.0.0 notes themselves carry the one BREAKING CHANGE | – |
| `package.json` at v9.1.1 and v10.1.7 (`main`, `exports`, `engines`, `typesVersions`) | 0 new (confirms Node >=20; the `./lib/*` wildcard export keeps every 9.x deep import path working) |
| `src/smtp-pool/index.ts` diff in commit 63ccd66 | confirms `maxRequeues` default went from unlimited to 5 |

Total: **23 entries**: 3 `breaking`, 20 `default-behavior`, 0 `deprecation`.

## The main judgment

Every changelog section in the window except 10.0.0's "BREAKING CHANGES" and the two "Features" sections (9.1.0, 10.0.0, 10.1.0) is "Bug Fixes". The rules leave out bug fixes "unless marked breaking or changing a default", and count "a default value changed, in any section". So from bug-fix commits I took only (a) a new or changed default value or limit (`maxResponseSize` 1 MB, `maxRequeues` 5, fetch 60 s / 64 MB / 2 min, DKIM cache mode 0600, group nesting cap), (b) the items a fix commit itself lists under "Behaviour changes" (5638ac1), and (c) one option-precedence change (requireTLS). Everything listed under the 10.1.0 **Features** commit 8009da6 ("harden message streams, SMTP connections and the connection pool") that changes existing behavior is included, because it is presented as a change, not a fix. This makes nodemailer's population large and mostly connection-level; many entries will likely be S2/S8 in the walk, but that is the walk's call.

## Judgment calls, included

- `9.1.0/max-recipients-default-cap`: a new option (feature) whose default (100000) changes behavior for existing code: a message over the cap now fails. Counted as a default change.
- `10.0.0/node-20-required`: the only bullet marked BREAKING (engines `>=6.0.0` → `>=20.0.0`). The "Node.js 6 syntax check and .npmignore are gone" part is repo tooling, not listed.
- `10.0.0/bundled-type-declarations`: the TypeScript migration is filed as a feature ("@types/nodemailer is no longer needed"), but the bundled `.d.ts` files now win over `@types/nodemailer` for every TS consumer. 10.0.1 (explicit `undefined`, internal members stripped) and 10.0.11 (layout of `@types/nodemailer` restored) narrowed the gap; the residual differences are not enumerated anywhere. Unsure; included as breaking so the walk can decide (S3/S6 are possible).
- `10.0.10/max-response-size-default`: new `maxResponseSize` option with a 1 MB default, in a fix commit ("reassemble multiline replies in linear time"). A new default limit.
- `10.0.12/pool-requeue-backoff-and-limit`, `10.0.12/fetch-timeout-and-size-defaults`: default values stated in the commit body of a fix ("bound fetch").
- `10.0.12/requiretls-beats-ignoretls`: filed as a fix ("honour requireTLS"), but it changes which of two documented options wins when both are set, like dotenv's precedence entries in v3. Unsure; included.
- `10.1.0/*` from the Features commit 8009da6: `pool-idle-timeout-default` (new `idleTimeout`, 4 min), `opportunistic-tls-refused-disables-auth`, `pipelined-envelope-and-data`, `tcp-keepalive-default` (keepalive 30 s; also folds in `noDelay` from fa9b8d3 and destroying a socket the server never closes: all socket options of one connection), `pool-rset-after-rejected-message`, `pool-requeue-dropped-reused-connection`, `destroyed-content-stream-fails-send`, `sendmail-early-exit-is-error` (also fa9b8d3).
- `10.1.0/connection-timeout-covers-setup`: spread over 8009da6 (feature: covers DNS), bdcd046, 91ed683, ec97d8f (fixes that extend it to the greeting, proxy and STARTTLS). One entry: what `connectionTimeout`/`greetingTimeout` bound.
- `10.1.0/idle-close-emits-end-only`, `10.1.0/any-421-ends-session`, `10.1.0/multi-address-connect-autoselectfamily`: listed by commit 5638ac1 under "Behaviour changes".
- `10.1.2/message-auth-credentials-only`: from a fix commit, but it removes the ability to set `accessUrl`, `clientId`, `clientSecret` (and other transport settings) in a message-level `auth`, i.e. removes accepted options at that level. Counted as breaking.
- `10.1.2/fetch-max-time-default`, `10.1.2/dkim-cache-file-mode-0600`: defaults stated in the fix commit e347fa2.
- `10.1.6/addressparser-group-nesting-unbounded`: 10.1.4 lowered the nesting cap from 50 to 10 ("The limit was 50. It is now 10."), a default change in a fix commit; 10.1.6 removed the cap entirely. One entry at 10.1.6, where the behavior the pinned version has first shipped; the 10.1.4 value is noted in the summary. Unsure (malformed input only, S6 is likely).

## Judgment calls, left out

- All addressparser fixes (9.0.6, 9.1.0, 10.0.5, 10.0.6, 10.0.9, 10.0.13, 10.0.14, 10.0.16, 10.1.4–10.1.6): parsing of malformed or adversarial address headers, filed as fixes and mostly security advisories. Two commits say "Observable change": 9.0.5 a9343b4 (`info.accepted`/`rejected`/`envelope` carry the quoted form for addresses that were previously emitted malformed) and 10.1.4 a1538ea (an entry that is only a comment holding an address parses to a name with an empty address). Both describe the effect of a fix on malformed input; left out.
- MIME/header encoding fixes (9.0.4, 9.0.5, 10.0.7, 10.0.8, 10.0.14 `parseHeaderValue` rules, 10.1.0 binary QP of lone CR/LF, 10.1.2 header keys stripped of whitespace and colons, 10.1.7 encoded-word-looking parameter values): corrections of output that was invalid or ambiguous; fixes.
- Security fixes that tighten sandboxing: 9.0.6 (prototype keys, `options.tls` limited to TLS settings on fetched attachments, refused redirect schemes), 9.1.1 (message data can no longer reopen `disableFileAccess`/`disableUrlAccess`), 10.0.2 (TLS servername out of the DNS cache), 10.1.1 (credentials stripped on cross-origin redirect). Fixes of security bugs; behavior for legitimate configurations is unchanged by intent.
- 9.1.0 UTS-46 domain mapping (259c32d, b212ac4): fix.
- 10.0.0 fixes: `createTransport({ url, ...other })` now applies the other keys (was silently dropping them), DKIM relaxed canonicalization of raw messages, colon in URL user names, legacy URL host refusal, empty interface table, greeting timer cleared, `lastServerResponse`, pool slot freed, `services.json` path kept.
- 10.0.4: `wellKnown()` resolves icloud.com/fastmail.com (data fix); SES transport throws ECONFIG at construction without `sesClient` (an earlier, cleaner failure for a config that never worked); fetch cookie path fixes (10.0.3, 10.0.4, 10.0.16).
- 10.0.10 Windows-path attachment filenames use the basename: fix.
- 10.0.11: CJS entry and `services` subpath compatibility restored, `qp.wrap()` termination, XOAUTH2-only login failure, `@types` layout restored: fixes of 10.0.0 regressions.
- 10.0.12 other bullets: `sendMail()` on a closed pool now errors instead of never calling back, bare CR → CRLF in DATA (SMTP smuggling), error selection for rejected recipients, one error per failed send: fixes.
- 10.0.15 `NodemailerError.code` typing: fix.
- 10.1.0 fixes not listed as behaviour changes: env/interface table not read on import, `ERR_ACCESS_DENIED` kept as the error code instead of EDNS/ESOCKET/ESTREAM/EFETCH (an error-code change for the same input, but filed and worded as a fix; noted in case the walk wants it), SMTPUTF8 domain decoding, second `connect()` refused, DATA after refused sender closes the connection; errors gain `originalCode` and `timeoutType` (additive).
- 10.1.0 performance (base64/QP encoding), 10.1.3 and 10.1.5 linear-time work: performance.
