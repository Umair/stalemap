# Held-out v3 benchmark results

`claude-sonnet-4-5` · 59 of 59 frozen tasks · 3 sessions per task, arm and mode · 0 sessions ended in an error (scored as failures).
Analysis as pre-registered in [PROTOCOL.md](PROTOCOL.md): per-task means of pass rates, both modes pooled unless a section says otherwise, with two-level bootstrap intervals (tasks, then runs within each task; 10,000 replicates). A win or loss needs the interval to exclude zero.

stalemap build: `c324be8` (the harness recorded uncommitted changes in the checkout), dist `98233bca38fb`.

> **Results against third-party tools are withheld pending permission.** The run had six arms and 2,124 sessions. The pre-registered secondary comparisons and two exploratory ones involved a third-party docs tool, and they are left out of this file, as are those arms' rows and columns. The four arms below (`alone`, `stalemap-guard`, the exploratory `oracle` hint and the exploratory plain `tsc-hook`) are reported in full.

## Primary comparison

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-guard vs alone | 59 | +10.2 pts | [2.8, 18.1] (95%) | **win** |

Decision: **stalemap helps** (the interval excludes zero).

## What it means

- **The primary claim holds:** with the notes and the edit-time guard, `claude-sonnet-4-5` passed 53% of sessions, against 43% with no help (+10.2 points, [2.8, 18.1]). It was a win in each mode too (one-shot +11.3, checks +9.0).
- **It did not beat a plain type-check hook.** A `tsc --noEmit` hook after every edit, with no notes, passed 55%: stalemap-guard vs tsc-hook was −2.0 points [−11.0, 7.1], a tie. This comparison was exploratory.
- **There is a lot of room left.** A one-line hand-written hint naming each task's change (`oracle`) passed 91%.
- **The pre-registered cost criterion was missed.** Against `alone`, stalemap-guard used more turns (median 8 vs 7), cost more ($0.091 vs $0.078 per session) and left stale API in the first edit about as often (34% vs 35%).
- After this run, the guard was found to skip compiler-option checks when the project's TypeScript version differed from stalemap's own, which this suite's TypeScript 7 tasks hit. The fixes since are unreleased and untested on a blind suite: see the [changelog](../../CHANGELOG.md).

## Caveats

- **One model** (`claude-sonnet-4-5`, cutoff July 2025).
- **Same author.** stalemap, the harness and the protocol share an author. The tasks were written by a separate session that didn't run stalemap or read its notes, guard or diff code (see [PROTOCOL.md](PROTOCOL.md)).
- The per-session raw results (`results.jsonl`) for this run aren't in the repository yet.

## Exploratory comparisons

Not part of the decision rule. 95% intervals.

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| oracle vs alone | 59 | +47.7 pts | [36.7, 58.8] (95%) | **win** |
| tsc-hook vs alone | 59 | +12.1 pts | [6.2, 18.4] (95%) | **win** |
| stalemap-guard vs tsc-hook | 59 | -2.0 pts | [-11.0, 7.1] (95%) | tie |

### One-shot (file tools only)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 58/177 (33%) | 42% | 37% | 6% | $0.068 | 39s | 6 | 0.0 |
| stalemap-guard | 78/177 (44%) | 35% | 37% | 6% | $0.085 | 49s | 8 | 0.4 |
| oracle | 154/177 (87%) | 3% | 5% | 0% | $0.061 | 32s | 5 | 0.0 |
| tsc-hook | 97/177 (55%) | 29% | 36% | 5% | $0.074 | 43s | 7 | 0.8 |

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-guard vs alone | 59 | +11.3 pts | [2.3, 20.9] (95%) | **win** |

### With checks (can run npm test)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 95/177 (54%) | 28% | 33% | 6% | $0.094 | 51s | 9 | 0.0 |
| stalemap-guard | 111/177 (63%) | 23% | 31% | 4% | $0.100 | 54s | 8 | 0.5 |
| oracle | 168/177 (95%) | 1% | 2% | 0% | $0.074 | 37s | 6 | 0.0 |
| tsc-hook | 99/177 (56%) | 28% | 32% | 7% | $0.087 | 46s | 8 | 0.8 |

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-guard vs alone | 59 | +9.0 pts | [0.6, 18.1] (95%) | **win** |

### Both modes pooled

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 153/354 (43%) | 35% | 35% | 6% | $0.078 | 44s | 7 | 0.0 |
| stalemap-guard | 189/354 (53%) | 29% | 34% | 5% | $0.091 | 51s | 8 | 0.5 |
| oracle | 322/354 (91%) | 2% | 4% | 0% | $0.067 | 34s | 6 | 0.0 |
| tsc-hook | 196/354 (55%) | 29% | 34% | 6% | $0.081 | 45s | 8 | 0.8 |

### By kind (exploratory)

| kind | tasks | alone | stalemap-guard | oracle | tsc-hook | stalemap-guard vs alone |
|---|---|---|---|---|---|---|
| compile-error | 27 | 90/162 (56%) | 100/162 (62%) | 148/162 (91%) | 121/162 (75%) | +6.2 pts [-1.9, 14.8] |
| type-checks | 32 | 63/192 (33%) | 89/192 (46%) | 174/192 (91%) | 75/192 (39%) | +13.5 pts [2.1, 26.6] |

### By change type (exploratory)

| change type | tasks | alone | stalemap-guard | oracle | tsc-hook | stalemap-guard vs alone |
|---|---|---|---|---|---|---|
| breaking | 35 | 102/210 (49%) | 131/210 (62%) | 192/210 (91%) | 132/210 (63%) | +13.8 pts [3.8, 25.2] |
| default-behavior | 12 | 17/72 (24%) | 23/72 (32%) | 60/72 (83%) | 25/72 (35%) | +8.3 pts [-6.9, 27.8] |
| deprecation | 12 | 34/72 (47%) | 35/72 (49%) | 70/72 (97%) | 39/72 (54%) | +1.4 pts [-8.3, 11.1] |

### By package (exploratory)

| package | tasks | alone | stalemap-guard | oracle | tsc-hook | stalemap-guard vs alone |
|---|---|---|---|---|---|---|
| axios | 3 | 2/18 (11%) | 10/18 (56%) | 18/18 (100%) | 1/18 (6%) | +44.4 pts [0.0, 100.0] |
| express | 1 | 3/6 (50%) | 3/6 (50%) | 6/6 (100%) | 2/6 (33%) | +0.0 pts [-33.3, 33.3] |
| lucide-react | 4 | 16/24 (67%) | 16/24 (67%) | 21/24 (88%) | 18/24 (75%) | +0.0 pts [-8.3, 8.3] |
| mongoose | 9 | 31/54 (57%) | 33/54 (61%) | 43/54 (80%) | 40/54 (74%) | +3.7 pts [-11.1, 20.4] |
| next | 16 | 26/96 (27%) | 45/96 (47%) | 93/96 (97%) | 32/96 (33%) | +19.8 pts [2.1, 40.6] |
| next-auth | 1 | 0/6 (0%) | 0/6 (0%) | 3/6 (50%) | 0/6 (0%) | +0.0 pts [0.0, 0.0] |
| openai | 1 | 1/6 (17%) | 2/6 (33%) | 1/6 (17%) | 4/6 (67%) | +16.7 pts [-16.7, 50.0] |
| typescript | 16 | 53/96 (55%) | 54/96 (56%) | 92/96 (96%) | 72/96 (75%) | +1.0 pts [-7.3, 9.4] |
| zod | 8 | 21/48 (44%) | 26/48 (54%) | 45/48 (94%) | 27/48 (56%) | +10.4 pts [-6.3, 29.2] |

### By scenario (exploratory)

| scenario | tasks | alone | stalemap-guard | oracle | tsc-hook | stalemap-guard vs alone |
|---|---|---|---|---|---|---|
| new-code | 43 | 92/258 (36%) | 122/258 (47%) | 228/258 (88%) | 117/258 (45%) | +11.6 pts [3.1, 21.3] |
| upgrade | 16 | 61/96 (64%) | 67/96 (70%) | 94/96 (98%) | 79/96 (82%) | +6.2 pts [-6.3, 21.9] |

## By task (passes out of runs, one-shot · checks)

| task | package | kind | alone | stalemap-guard | oracle | tsc-hook |
|---|---|---|---|---|---|---|
| axios-download-redirects | axios | type-checks | 0/3 · 0/3 | 0/3 · 1/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| axios-fetch-length-limits | axios | type-checks | 0/3 · 0/3 | 3/3 · 3/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| axios-upload-too-large | axios | type-checks | 1/3 · 1/3 | 2/3 · 1/3 | 3/3 · 3/3 | 1/3 · 0/3 |
| express-body-limit-upgrade | express | type-checks | 0/3 · 3/3 | 1/3 · 2/3 | 3/3 · 3/3 | 1/3 · 1/3 |
| lucide-crisp-strokes | lucide-react | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| lucide-icon-shapes | lucide-react | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 1/3 · 3/3 | 3/3 · 3/3 |
| lucide-swiss-franc | lucide-react | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| lucide-uploaded-icons | lucide-react | type-checks | 1/3 · 3/3 | 1/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 |
| mongoose-article-slug | mongoose | compile-error | 0/3 · 2/3 | 1/3 · 1/3 | 2/3 · 2/3 | 2/3 · 2/3 |
| mongoose-change-events | mongoose | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| mongoose-failed-logins | mongoose | type-checks | 2/3 · 2/3 | 2/3 · 2/3 | 3/3 · 3/3 | 3/3 · 2/3 |
| mongoose-field-check | mongoose | type-checks | 1/3 · 2/3 | 1/3 · 2/3 | 0/3 · 3/3 | 2/3 · 2/3 |
| mongoose-meetup-rules | mongoose | compile-error | 0/3 · 0/3 | 2/3 · 1/3 | 1/3 · 2/3 | 1/3 · 2/3 |
| mongoose-orders-by-id-time | mongoose | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| mongoose-product-search | mongoose | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| mongoose-supplier-import | mongoose | compile-error | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| mongoose-user-input-type | mongoose | compile-error | 1/3 · 3/3 | 1/3 · 2/3 | 0/3 · 3/3 | 3/3 · 3/3 |
| next-amp-removed | next | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| next-cachelife-cachetag | next | type-checks | 3/3 · 3/3 | 1/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| next-config-custom-key | next | compile-error | 1/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| next-custom-server-render | next | type-checks | 0/3 · 1/3 | 0/3 · 1/3 | 2/3 · 3/3 | 2/3 · 0/3 |
| next-experimental-ppr | next | type-checks | 0/3 · 0/3 | 3/3 · 3/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| next-experimental-turbo | next | compile-error | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| next-image-local-ip | next | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| next-image-max-redirects | next | type-checks | 0/3 · 1/3 | 2/3 · 3/3 | 3/3 · 3/3 | 1/3 · 3/3 |
| next-image-quality | next | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| next-legacy-image | next | type-checks | 2/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 | 3/3 · 2/3 |
| next-metadata-route-args | next | type-checks | 0/3 · 0/3 | 3/3 · 3/3 | 2/3 · 2/3 | 0/3 · 0/3 |
| next-middleware-proxy | next | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| next-root-params | next | compile-error | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| next-turbopack-build-cache | next | compile-error | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| next-unrecognized-action | next | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| next-viewtransition-flag | next | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 2/3 · 1/3 |
| nextauth-plus-address-login | next-auth | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 2/3 · 1/3 | 0/3 · 0/3 |
| openai-realtime-reply | openai | type-checks | 0/3 · 1/3 | 0/3 · 2/3 | 0/3 · 1/3 | 2/3 · 2/3 |
| ts-check-doc-examples | typescript | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| ts-commonjs-build | typescript | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 1/3 |
| ts-implicit-any-first | typescript | compile-error | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 3/3 | 0/3 · 0/3 |
| ts-library-build-output | typescript | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 1/3 · 1/3 |
| ts-nav-label-length | typescript | type-checks | 2/3 · 2/3 | 2/3 · 3/3 | 3/3 · 3/3 | 1/3 · 2/3 |
| ts-service-worker-types | typescript | compile-error | 2/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-browser-app | typescript | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-build-config | typescript | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-checkout-widget | typescript | compile-error | 0/3 · 3/3 | 0/3 · 2/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-express-api | typescript | compile-error | 2/3 · 3/3 | 1/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-json-imports | typescript | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-legacy-helpers | typescript | compile-error | 2/3 · 3/3 | 1/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-parcel-tracking | typescript | compile-error | 0/3 · 3/3 | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-path-aliases | typescript | compile-error | 0/3 · 3/3 | 0/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-slug-library | typescript | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-storefront-scripts | typescript | compile-error | 0/3 · 1/3 | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| zod-body-validation | zod | type-checks | 1/3 · 3/3 | 2/3 · 2/3 | 3/3 · 3/3 | 2/3 · 3/3 |
| zod-group-booking | zod | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| zod-localized-errors | zod | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| zod-partner-event-times | zod | type-checks | 0/3 · 0/3 | 0/3 · 3/3 | 3/3 · 3/3 | 0/3 · 1/3 |
| zod-plugin-commands | zod | compile-error | 1/3 · 0/3 | 2/3 · 2/3 | 3/3 · 2/3 | 1/3 · 2/3 |
| zod-signup-strict-form | zod | type-checks | 0/3 · 1/3 | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| zod-theme-overrides | zod | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 2/3 | 3/3 · 3/3 |
| zod-upgrade-country-guard | zod | compile-error | 0/3 · 3/3 | 0/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 |
