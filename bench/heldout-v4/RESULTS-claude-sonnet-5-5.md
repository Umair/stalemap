# Held-out v4 benchmark results

`claude-sonnet-5-5` · 1584 sessions · 66 of 66 frozen tasks · 0 sessions ended in an error (scored as failures).
`claude-sonnet-5-5` is the primary model in the protocol.

Analysis as pre-registered in [PROTOCOL.md](PROTOCOL.md): per-task means of pass rates, both modes pooled unless a section says otherwise, with two-level bootstrap intervals (tasks, then runs within each task; 10,000 replicates). A win or loss needs the interval to exclude zero.

Complete: every frozen task has 3 sessions per arm and mode.

stalemap build: `cf04f6c`, dist `e5a6427952d5`.

## Primary comparison

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-full vs alone | 66 | +20.7 pts | [13.6, 28.3] (95%) | **win** |

Decision: **stalemap helps** (the interval excludes zero).

## Secondary comparisons (Bonferroni over 3: 98.3% intervals)

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-full vs tsc-hook | 66 | +16.4 pts | [7.6, 26.0] (98.3%) | **win** |

## Exploratory

Not part of the decision rule. 95% intervals.

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| tsc-hook vs alone | 66 | +4.3 pts | [-1.8, 10.4] (95%) | tie |
| oracle vs alone | 66 | +29.5 pts | [20.7, 39.1] (95%) | **win** |
| oracle vs stalemap-full | 66 | +8.8 pts | [2.8, 15.7] (95%) | **win** |

### One-shot (file tools only)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 119/198 (60%) | 37% | 29% | 4% | $0.037 | 21s | 7 | 0.0 |
| stalemap-full | 176/198 (89%) | 10% | 10% | 0% | $0.048 | 25s | 7 | 0.4 |
| tsc-hook | 146/198 (74%) | 24% | 30% | 4% | $0.039 | 24s | 7.5 | 0.7 |
| oracle | 190/198 (96%) | 3% | 2% | 0% | $0.031 | 17s | 5 | 0.0 |

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-full vs alone | 66 | +28.8 pts | [18.7, 39.4] (95%) | **win** |
| stalemap-full vs tsc-hook | 66 | +15.2 pts | [6.1, 24.2] (95%) | **win** |

### With checks (can run npm test)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 152/198 (77%) | 22% | 25% | 4% | $0.047 | 28s | 9.5 | 0.0 |
| stalemap-full | 177/198 (89%) | 13% | 12% | 0% | $0.053 | 26s | 8 | 0.4 |
| tsc-hook | 142/198 (72%) | 25% | 30% | 3% | $0.046 | 30s | 9 | 0.6 |
| oracle | 198/198 (100%) | 1% | 0% | 0% | $0.037 | 22s | 7 | 0.0 |

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-full vs alone | 66 | +12.6 pts | [4.5, 20.7] (95%) | **win** |
| stalemap-full vs tsc-hook | 66 | +17.7 pts | [9.6, 26.3] (95%) | **win** |

### Both modes pooled

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 271/396 (68%) | 29% | 27% | 4% | $0.041 | 25s | 8 | 0.0 |
| stalemap-full | 353/396 (89%) | 12% | 11% | 0% | $0.050 | 26s | 7 | 0.4 |
| tsc-hook | 288/396 (73%) | 24% | 30% | 3% | $0.042 | 26s | 8 | 0.6 |
| oracle | 388/396 (98%) | 2% | 1% | 0% | $0.034 | 19s | 6 | 0.0 |

### By kind (exploratory)

| kind | tasks | alone | stalemap-full | tsc-hook | oracle | stalemap-full vs alone |
|---|---|---|---|---|---|---|
| compile-error | 24 | 97/144 (67%) | 137/144 (95%) | 122/144 (85%) | 138/144 (96%) | +27.8 pts [16.0, 40.3] |
| type-checks | 42 | 174/252 (69%) | 216/252 (86%) | 166/252 (66%) | 250/252 (99%) | +16.7 pts [8.3, 26.2] |

### By change type (exploratory)

| change type | tasks | alone | stalemap-full | tsc-hook | oracle | stalemap-full vs alone |
|---|---|---|---|---|---|---|
| breaking | 34 | 131/204 (64%) | 186/204 (91%) | 153/204 (75%) | 197/204 (97%) | +27.0 pts [16.7, 38.2] |
| default-behavior | 25 | 115/150 (77%) | 128/150 (85%) | 112/150 (75%) | 150/150 (100%) | +8.7 pts [0.7, 17.3] |
| deprecation | 7 | 25/42 (60%) | 39/42 (93%) | 23/42 (55%) | 41/42 (98%) | +33.3 pts [9.5, 61.9] |

### By package (exploratory)

| package | tasks | alone | stalemap-full | tsc-hook | oracle | stalemap-full vs alone |
|---|---|---|---|---|---|---|
| @tanstack/react-query | 2 | 3/12 (25%) | 12/12 (100%) | 6/12 (50%) | 9/12 (75%) | +75.0 pts [50.0, 100.0] |
| better-auth | 10 | 29/60 (48%) | 39/60 (65%) | 33/60 (55%) | 59/60 (98%) | +16.7 pts [-1.7, 36.7] |
| dotenv | 2 | 12/12 (100%) | 12/12 (100%) | 12/12 (100%) | 12/12 (100%) | +0.0 pts [0.0, 0.0] |
| eslint | 4 | 21/24 (88%) | 23/24 (96%) | 20/24 (83%) | 24/24 (100%) | +8.3 pts [0.0, 29.2] |
| express | 1 | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +0.0 pts [0.0, 0.0] |
| firebase | 8 | 28/48 (58%) | 38/48 (79%) | 31/48 (65%) | 48/48 (100%) | +20.8 pts [4.2, 39.6] |
| jest | 1 | 0/6 (0%) | 3/6 (50%) | 0/6 (0%) | 5/6 (83%) | +50.0 pts [50.0, 50.0] |
| multer | 2 | 9/12 (75%) | 12/12 (100%) | 9/12 (75%) | 12/12 (100%) | +25.0 pts [0.0, 66.7] |
| next | 4 | 9/24 (38%) | 24/24 (100%) | 10/24 (42%) | 24/24 (100%) | +62.5 pts [20.8, 100.0] |
| next-auth | 1 | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +0.0 pts [0.0, 0.0] |
| nodemailer | 2 | 10/12 (83%) | 12/12 (100%) | 8/12 (67%) | 12/12 (100%) | +16.7 pts [0.0, 50.0] |
| preact | 3 | 12/18 (67%) | 14/18 (78%) | 12/18 (67%) | 18/18 (100%) | +11.1 pts [0.0, 33.3] |
| react | 1 | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +0.0 pts [0.0, 0.0] |
| react-hook-form | 2 | 9/12 (75%) | 12/12 (100%) | 12/12 (100%) | 9/12 (75%) | +25.0 pts [0.0, 50.0] |
| react-router | 1 | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +0.0 pts [0.0, 0.0] |
| stripe | 5 | 21/30 (70%) | 26/30 (87%) | 24/30 (80%) | 30/30 (100%) | +16.7 pts [-6.7, 40.0] |
| typescript | 4 | 23/24 (96%) | 24/24 (100%) | 24/24 (100%) | 24/24 (100%) | +4.2 pts [0.0, 16.7] |
| vite | 1 | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +0.0 pts [0.0, 0.0] |
| vitest | 10 | 43/60 (72%) | 60/60 (100%) | 45/60 (75%) | 60/60 (100%) | +28.3 pts [11.7, 46.7] |
| zod | 2 | 12/12 (100%) | 12/12 (100%) | 12/12 (100%) | 12/12 (100%) | +0.0 pts [0.0, 0.0] |

### By scenario (exploratory)

| scenario | tasks | alone | stalemap-full | tsc-hook | oracle | stalemap-full vs alone |
|---|---|---|---|---|---|---|
| new-code | 51 | 205/306 (67%) | 269/306 (88%) | 221/306 (72%) | 301/306 (98%) | +20.9 pts [12.7, 29.7] |
| upgrade | 15 | 66/90 (73%) | 84/90 (93%) | 67/90 (74%) | 87/90 (97%) | +20.0 pts [6.7, 36.7] |

## By task (passes out of runs, one-shot · checks)

| task | package | kind | alone | stalemap-full | tsc-hook | oracle |
|---|---|---|---|---|---|---|
| better-auth-acme-sso | better-auth | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| better-auth-cancel-magic-link | better-auth | type-checks | 0/3 · 1/3 | 3/3 · 1/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| better-auth-gateway-token-exchange | better-auth | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| better-auth-lean-sqlite-schema | better-auth | type-checks | 0/3 · 2/3 | 1/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| better-auth-long-password-login | better-auth | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| better-auth-microsoft-any-tenant | better-auth | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| better-auth-mobile-id-token | better-auth | type-checks | 0/3 · 0/3 | 1/3 · 3/3 | 0/3 · 0/3 | 2/3 · 3/3 |
| better-auth-proxy-reset-links | better-auth | type-checks | 0/3 · 0/3 | 1/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| better-auth-session-history | better-auth | type-checks | 2/3 · 1/3 | 2/3 · 0/3 | 3/3 · 0/3 | 3/3 · 3/3 |
| better-auth-shared-rate-limit | better-auth | compile-error | 0/3 · 2/3 | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| dotenv-applied-env-keys | dotenv | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| dotenv-quiet-loader | dotenv | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| eslint-upgrade-chart-registry | eslint | type-checks | 1/3 · 2/3 | 3/3 · 2/3 | 2/3 · 0/3 | 3/3 · 3/3 |
| eslint-upgrade-job-runner | eslint | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| eslint-upgrade-model-mixins | eslint | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| eslint-upgrade-rollout-weights | eslint | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| express-report-download-name | express | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| firebase-chat-or-model | firebase | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| firebase-coupon-error-reason | firebase | type-checks | 0/3 · 0/3 | 1/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| firebase-hybrid-cloud-model | firebase | type-checks | 0/3 · 0/3 | 1/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| firebase-live-mic-audio | firebase | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| firebase-product-image | firebase | compile-error | 2/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| firebase-team-member-role | firebase | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| firebase-template-request | firebase | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 |
| firebase-vertex-region | firebase | compile-error | 0/3 · 2/3 | 3/3 · 3/3 | 0/3 · 2/3 | 3/3 · 3/3 |
| jest-fixture-path-helper | jest | type-checks | 0/3 · 0/3 | 0/3 · 3/3 | 0/3 · 0/3 | 2/3 · 3/3 |
| multer-file-count-upgrade | multer | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| multer-parts-cap-upgrade | multer | type-checks | 2/3 · 1/3 | 3/3 · 3/3 | 2/3 · 1/3 | 3/3 · 3/3 |
| next-account-page-build | next | type-checks | 1/3 · 2/3 | 3/3 · 3/3 | 2/3 · 1/3 | 3/3 · 3/3 |
| next-bundle-tree-shaking | next | compile-error | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 1/3 | 3/3 · 3/3 |
| next-og-share-card | next | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| next-upgrade-focus-config | next | type-checks | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| nextauth-tenant-redirect | next-auth | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| nodemailer-relay-greet-pause | nodemailer | type-checks | 2/3 · 2/3 | 3/3 · 3/3 | 1/3 · 1/3 | 3/3 · 3/3 |
| nodemailer-relay-reconnect | nodemailer | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| preact-activity-heatmap | preact | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| preact-help-shortcut | preact | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 2/3 | 3/3 · 3/3 |
| preact-tally-reset-all | preact | type-checks | 0/3 · 0/3 | 2/3 · 0/3 | 1/3 · 0/3 | 3/3 · 3/3 |
| react-crawler-render | react | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| react-query-product-suspense | @tanstack/react-query | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 0/3 · 3/3 |
| react-query-project-loader | @tanstack/react-query | type-checks | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| react-router-download-links | react-router | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| rhf-quiz-correct-answer | react-hook-form | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| rhf-submit-error-toast | react-hook-form | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 0/3 · 3/3 |
| stripe-capability-badge | stripe | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| stripe-card-decline | stripe | compile-error | 3/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| stripe-card-only-checkout | stripe | compile-error | 0/3 · 0/3 | 0/3 · 3/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| stripe-order-state | stripe | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| stripe-webhook-replay | stripe | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-session-types | typescript | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-shipping-quotes | typescript | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-site-generator | typescript | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-status-badges | typescript | compile-error | 2/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vite-admin-page-build | vite | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vitest-ci-attachments | vitest | type-checks | 0/3 · 2/3 | 3/3 · 3/3 | 1/3 · 2/3 | 3/3 · 3/3 |
| vitest-ci-test-settings | vitest | compile-error | 0/3 · 2/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vitest-coverage-upgrade | vitest | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vitest-dom-project-platform | vitest | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vitest-full-case-titles | vitest | type-checks | 3/3 · 2/3 | 3/3 · 3/3 | 3/3 · 2/3 | 3/3 · 3/3 |
| vitest-kiosk-env-teardown | vitest | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 1/3 · 1/3 | 3/3 · 3/3 |
| vitest-list-test-names | vitest | type-checks | 2/3 · 2/3 | 3/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 |
| vitest-module-cache-dir | vitest | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| vitest-restock-flow-order | vitest | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vitest-slug-case-names | vitest | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| zod-typed-queue-jobs | zod | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| zod-widget-grid-pairs | zod | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
