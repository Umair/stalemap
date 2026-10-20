# stripe: sources and judgment calls

Package `stripe` (repo stripe/stripe-node). Pinned version **23.0.0**.

## Version range

8 stable versions published after 2026-06-30 and on or before 2026-10-19 (`npm view stripe time --json`, UTC): 22.3.1 (2026-07-09), 22.3.2 (2026-07-16), 22.4.0 (2026-07-29), 22.5.0 (2026-08-10), 22.6.0 (2026-08-27), 22.6.1 (2026-09-01), 22.6.2 (2026-09-09), 23.0.0 (2026-10-01). The many `-alpha`/`-beta` prereleases are ignored. Dates are npm publish dates (the changelog headings are a day earlier for 22.6.0 and 23.0.0). Pre-window baseline: 22.3.0 (2026-06-24, pinned API version `2026-06-24.dahlia`).

## Sources consulted

| source | entries |
|---|---|
| `npm view stripe time --json` | version list and dates |
| https://github.com/stripe/stripe-node/blob/v23.0.0/CHANGELOG.md, sections 22.3.1 – 23.0.0, read in full | 26 |
| GitHub releases v22.3.1 … v23.0.0 (`gh api repos/stripe/stripe-node/releases --paginate`): bullets identical to the changelog except that the release bodies omit some ⚠️ markers; the v23.0.0 release body only links the changelog | 0 new |
| Migration guide for v23: https://github.com/stripe/stripe-node/wiki/Migration-guide-for-v23 (wiki repo cloned; last edited 2026-09-30) | 0 new; merged into 7 entries (API version, Node 20, V2List, V2 addresses, ErrorType, connection errors, verifyHeader) and confirms constructEventWithoutVerification |
| Stripe API changelog for `2026-09-30.endive` (linked from the guide): not expanded; the SDK-level consequences are the generated-code ⚠️ bullets | — |
| PRs #2781, #2783, #2786, #2801, #2841 (to settle bullets); npm type declarations of 22.3.0, 22.4.0, 22.6.0 and 23.0.0 grepped to check that changed fields existed before 2026-07-01 | used for in-window checks |

Total: **26 entries**: 23 `breaking`, 0 `deprecation`, 3 `default-behavior`.

## How the rules were applied

Stripe's changelog has no Features/Fixes sections; each release is a flat list, with ⚠️ marking breaking items, and the generated-code bullets list every API-surface change. Per the brief, generated "Add support for …" bullets (new resources, methods, params, enum values on request enums) are additions and left out; every ⚠️ generated bullet and every removal or type change of an existing field is an entry. Several ⚠️ bullets of the same kind in one release (new values on existing response enums) are one entry; otherwise one bullet is one entry.

## Judgment calls

Included:
- `22.4.0/api-version-2026-07-29`, `22.6.0/api-version-2026-08-26` (default-behavior, **unsure**): "This release changes the pinned API version to …". The SDK's default `apiVersion` is a default value; these are monthly, nominally backward-compatible "dahlia" releases, so the walk may well skip them, but by the protocol a changed default counts. `23.0.0/api-version-endive` is `breaking` because it moves to a new major API release and leads the v23 migration guide.
- `22.4.0/open-enums-otherstring` (breaking, **unsure**): #2786 appends `OtherString` (`string & Record<never, never>`) to every open enum union in the type declarations (0 occurrences in 22.3.0, 122 files in 22.4.0). Not marked ⚠️, but it changes the types of many existing response fields (exhaustive `switch`/`never` checks and assignments to the old literal unions break).
- `22.4.0/limited-use-params-removed` (breaking): two "Remove support for …" generated bullets not marked ⚠️ ("limited-use and being deprecated"); removals of existing request params count regardless.
- `22.6.0/v2-discriminated-union-throws` (breaking): ⚠️ sub-bullet of #2801.
- `22.6.0/payment-record-cryptogram-removed` (breaking): ⚠️ generated bullet; PaymentRecord/PaymentAttemptRecord exist in 22.3.0.
- `22.6.2/empty-webhook-secret-throws` (default-behavior, **unsure**): #2841 is a security fix ("Validate that webhook secrets are non-empty"), but Stripe's changelog has no fix section and the line presents a change: the same call that used to return a verified event with an empty secret now throws.
- `23.0.0/verifyheader-default-tolerance` and `23.0.0/constructevent-zero-tolerance-skips`: one ⚠️ bullet (#2876) describing two independent behavior changes; split.
- 23.0.0 generated ⚠️ bullets: `account-reject-reason-enum`, `response-enums-new-values` (five ⚠️ "Add support for new value(s)" bullets on response enums, merged), `reserve-release-bulk-hold-expiry-removed`, `charge-card-mandate-expandable`, `payment-method-types-param-removed`, `setup-future-usage-enum` (the ⚠️ bullet on response types; the matching non-⚠️ bullet on the params is a widening), `fc-session-countries-removed`, `billing-cycle-anchor-param-type` (two ⚠️ bullets, same change to the same param on different operations, merged), `payment-method-update-payto-removed`, `radar-fraud-score-nullable`, `v2-account-link-configurations-removed`. Reserve, Radar.PaymentEvaluation, V2 AccountLinks, FinancialConnections session `countries` and `payto` all exist in 22.3.0. The `response-enums-new-values` entry adds values to output enums: by the brief's rule it is not "a new endpoint", and the notes mark it breaking, so it is kept.

Left out:
- 23.0.0 ⚠️ "Remove Stripe.constructEventWithoutVerification": added in 22.5.0 (2026-08-10), inside the window.
- 23.0.0 ⚠️ "Remove support for `igic` on Tax.Registration.country_options.<EU>": `igic` was added in 22.6.0 (inside the window; absent from 22.3.0/22.4.0 types).
- 22.6.0 "Change `PaymentIntent.allowed_payment_method_types` and `SetupIntent.allowed_payment_method_types` to be required": the field was added in 22.4.0.
- 22.6.0 #2815 "correctly throw connection errors if the server drops while sending the HTTP response body": presented as a fix (requests that used to hang now throw); its follow-up in 23.0.0 (the error class) is an entry.
- 22.5.0 #2805 "Emit Claude Code plugin hint at module load time": console output only, a new message (logging).
- 22.5.0 event-parsing helpers, `stripe.major_api_version`; 22.6.0 `EventNotificationHandler`; 23.0.0 #2844, #2853 (opt-in `STRIPE_SUPPRESS_NOTICES`), #2850 fix, NodeHttpClient fix: features or fixes.
- 22.3.1 #2778 restored v21 type exports and #2779 "Export HttpClient types as interfaces instead of classes": restores exports dropped in 22.0.0 (pre-window) in a looser form; #2781 "Remove unused Retry-After header support": the API never sends the header, so this is dead-code removal with no behavior change.
- 22.3.2 #2783 "Make Error fields generated" (adds fields), #2784 telemetry.
- 22.6.1: hardening and fixes (#2829, #2835, #2831), docstring.
- Generated non-⚠️ "Add support for …" bullets throughout (new resources, methods, params, request-enum values): additions. 23.0.0 "Change … to be optional" on `trial_settings.end_behavior.missing_payment_method`: loosening.
