# Held-out v4 benchmark results

`claude-sonnet-4-5` · 1584 sessions · 66 of 66 frozen tasks · 0 sessions ended in an error (scored as failures).
`claude-sonnet-4-5` is the secondary model in the protocol.

Analysis as pre-registered in [PROTOCOL.md](PROTOCOL.md): per-task means of pass rates, both modes pooled unless a section says otherwise, with two-level bootstrap intervals (tasks, then runs within each task; 10,000 replicates). A win or loss needs the interval to exclude zero.

Complete: every frozen task has 3 sessions per arm and mode.

stalemap build: `5ad344b`, dist `e5a6427952d5`.

## Secondary comparisons (Bonferroni over 3: 98.3% intervals)

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-full vs alone | 66 | +17.9 pts | [7.6, 28.8] (98.3%) | **win** |
| stalemap-full vs tsc-hook | 66 | +10.6 pts | [0.3, 21.7] (98.3%) | **win** |

## Exploratory

Not part of the decision rule. 95% intervals.

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| tsc-hook vs alone | 66 | +7.3 pts | [2.3, 12.9] (95%) | **win** |
| oracle vs alone | 66 | +31.6 pts | [21.0, 42.2] (95%) | **win** |
| oracle vs stalemap-full | 66 | +13.6 pts | [4.8, 22.7] (95%) | **win** |

### One-shot (file tools only)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 76/198 (38%) | 33% | 25% | 5% | $0.071 | 39s | 7 | 0.0 |
| stalemap-full | 126/198 (64%) | 24% | 20% | 2% | $0.118 | 93s | 9 | 0.8 |
| tsc-hook | 106/198 (54%) | 25% | 23% | 5% | $0.090 | 52s | 7 | 1.7 |
| oracle | 138/198 (70%) | 6% | 3% | 0% | $0.067 | 37s | 5 | 0.0 |

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-full vs alone | 66 | +25.3 pts | [14.1, 36.4] (95%) | **win** |
| stalemap-full vs tsc-hook | 66 | +10.1 pts | [-0.0, 20.2] (95%) | tie |

### With checks (can run npm test)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 106/198 (54%) | 26% | 23% | 5% | $0.106 | 59s | 9 | 0.0 |
| stalemap-full | 127/198 (64%) | 21% | 19% | 2% | $0.129 | 74s | 10 | 0.9 |
| tsc-hook | 105/198 (53%) | 23% | 22% | 4% | $0.099 | 57s | 9 | 1.5 |
| oracle | 169/198 (85%) | 4% | 1% | 0% | $0.086 | 44s | 7 | 0.0 |

| comparison | tasks | pass-rate difference | interval | verdict |
|---|---|---|---|---|
| stalemap-full vs alone | 66 | +10.6 pts | [1.0, 20.7] (95%) | **win** |
| stalemap-full vs tsc-hook | 66 | +11.1 pts | [1.5, 21.2] (95%) | **win** |

### Both modes pooled

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 182/396 (46%) | 30% | 24% | 5% | $0.085 | 47s | 8 | 0.0 |
| stalemap-full | 253/396 (64%) | 23% | 19% | 2% | $0.124 | 79s | 10 | 0.9 |
| tsc-hook | 211/396 (53%) | 24% | 23% | 4% | $0.096 | 54s | 8 | 1.6 |
| oracle | 307/396 (78%) | 5% | 2% | 0% | $0.076 | 40s | 6 | 0.0 |

### By kind (exploratory)

| kind | tasks | alone | stalemap-full | tsc-hook | oracle | stalemap-full vs alone |
|---|---|---|---|---|---|---|
| compile-error | 24 | 64/144 (44%) | 116/144 (81%) | 79/144 (55%) | 113/144 (78%) | +36.1 pts [20.1, 52.1] |
| type-checks | 42 | 118/252 (47%) | 137/252 (54%) | 132/252 (52%) | 194/252 (77%) | +7.5 pts [-0.4, 16.3] |

### By change type (exploratory)

| change type | tasks | alone | stalemap-full | tsc-hook | oracle | stalemap-full vs alone |
|---|---|---|---|---|---|---|
| breaking | 34 | 83/204 (41%) | 146/204 (72%) | 94/204 (46%) | 167/204 (82%) | +30.9 pts [17.2, 45.1] |
| default-behavior | 25 | 83/150 (55%) | 89/150 (59%) | 99/150 (66%) | 109/150 (73%) | +4.0 pts [-4.7, 12.7] |
| deprecation | 7 | 16/42 (38%) | 18/42 (43%) | 18/42 (43%) | 31/42 (74%) | +4.8 pts [-9.5, 21.4] |

### By package (exploratory)

| package | tasks | alone | stalemap-full | tsc-hook | oracle | stalemap-full vs alone |
|---|---|---|---|---|---|---|
| @tanstack/react-query | 2 | 3/12 (25%) | 8/12 (67%) | 6/12 (50%) | 9/12 (75%) | +41.7 pts [25.0, 50.0] |
| better-auth | 10 | 9/60 (15%) | 22/60 (37%) | 11/60 (18%) | 28/60 (47%) | +21.7 pts [5.0, 40.0] |
| dotenv | 2 | 6/12 (50%) | 6/12 (50%) | 7/12 (58%) | 12/12 (100%) | +0.0 pts [0.0, 0.0] |
| eslint | 4 | 21/24 (88%) | 19/24 (79%) | 21/24 (88%) | 22/24 (92%) | -8.3 pts [-33.3, 16.7] |
| express | 1 | 5/6 (83%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +16.7 pts [0.0, 50.0] |
| firebase | 8 | 12/48 (25%) | 32/48 (67%) | 16/48 (33%) | 35/48 (73%) | +41.7 pts [14.6, 70.8] |
| jest | 1 | 0/6 (0%) | 0/6 (0%) | 1/6 (17%) | 0/6 (0%) | +0.0 pts [0.0, 0.0] |
| multer | 2 | 11/12 (92%) | 8/12 (67%) | 12/12 (100%) | 12/12 (100%) | -25.0 pts [-66.7, 0.0] |
| next | 4 | 12/24 (50%) | 18/24 (75%) | 12/24 (50%) | 22/24 (92%) | +25.0 pts [0.0, 75.0] |
| next-auth | 1 | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +0.0 pts [0.0, 0.0] |
| nodemailer | 2 | 12/12 (100%) | 12/12 (100%) | 12/12 (100%) | 12/12 (100%) | +0.0 pts [0.0, 0.0] |
| preact | 3 | 5/18 (28%) | 6/18 (33%) | 7/18 (39%) | 16/18 (89%) | +5.6 pts [-11.1, 22.2] |
| react | 1 | 4/6 (67%) | 4/6 (67%) | 6/6 (100%) | 3/6 (50%) | +0.0 pts [-50.0, 33.3] |
| react-hook-form | 2 | 8/12 (67%) | 10/12 (83%) | 12/12 (100%) | 9/12 (75%) | +16.7 pts [-16.7, 41.7] |
| react-router | 1 | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +0.0 pts [0.0, 0.0] |
| stripe | 5 | 9/30 (30%) | 18/30 (60%) | 9/30 (30%) | 28/30 (93%) | +30.0 pts [-13.3, 70.0] |
| typescript | 4 | 14/24 (58%) | 22/24 (92%) | 17/24 (71%) | 17/24 (71%) | +33.3 pts [12.5, 50.0] |
| vite | 1 | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | 6/6 (100%) | +0.0 pts [0.0, 0.0] |
| vitest | 10 | 24/60 (40%) | 34/60 (57%) | 28/60 (47%) | 46/60 (77%) | +16.7 pts [-6.7, 43.3] |
| zod | 2 | 9/12 (75%) | 10/12 (83%) | 10/12 (83%) | 12/12 (100%) | +8.3 pts [-16.7, 41.7] |

### By scenario (exploratory)

| scenario | tasks | alone | stalemap-full | tsc-hook | oracle | stalemap-full vs alone |
|---|---|---|---|---|---|---|
| new-code | 51 | 115/306 (38%) | 179/306 (58%) | 137/306 (45%) | 229/306 (75%) | +20.9 pts [11.1, 31.4] |
| upgrade | 15 | 67/90 (74%) | 74/90 (82%) | 74/90 (82%) | 78/90 (87%) | +7.8 pts [-7.8, 22.2] |

## By task (passes out of runs, one-shot · checks)

| task | package | kind | alone | stalemap-full | tsc-hook | oracle |
|---|---|---|---|---|---|---|
| better-auth-acme-sso | better-auth | type-checks | 0/3 · 0/3 | 0/3 · 1/3 | 0/3 · 0/3 | 0/3 · 1/3 |
| better-auth-cancel-magic-link | better-auth | type-checks | 0/3 · 0/3 | 0/3 · 1/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| better-auth-gateway-token-exchange | better-auth | compile-error | 1/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 |
| better-auth-lean-sqlite-schema | better-auth | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 |
| better-auth-long-password-login | better-auth | type-checks | 0/3 · 0/3 | 1/3 · 1/3 | 2/3 · 0/3 | 0/3 · 0/3 |
| better-auth-microsoft-any-tenant | better-auth | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| better-auth-mobile-id-token | better-auth | type-checks | 0/3 · 0/3 | 0/3 · 3/3 | 0/3 · 0/3 | 0/3 · 3/3 |
| better-auth-proxy-reset-links | better-auth | type-checks | 0/3 · 0/3 | 2/3 · 1/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| better-auth-session-history | better-auth | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 |
| better-auth-shared-rate-limit | better-auth | compile-error | 0/3 · 2/3 | 3/3 · 3/3 | 2/3 · 1/3 | 3/3 · 3/3 |
| dotenv-applied-env-keys | dotenv | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| dotenv-quiet-loader | dotenv | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 1/3 · 0/3 | 3/3 · 3/3 |
| eslint-upgrade-chart-registry | eslint | type-checks | 3/3 · 1/3 | 2/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| eslint-upgrade-job-runner | eslint | type-checks | 3/3 · 2/3 | 1/3 · 2/3 | 3/3 · 0/3 | 3/3 · 2/3 |
| eslint-upgrade-model-mixins | eslint | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 2/3 |
| eslint-upgrade-rollout-weights | eslint | type-checks | 3/3 · 3/3 | 3/3 · 2/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| express-report-download-name | express | type-checks | 3/3 · 2/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| firebase-chat-or-model | firebase | compile-error | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| firebase-coupon-error-reason | firebase | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 |
| firebase-hybrid-cloud-model | firebase | type-checks | 0/3 · 0/3 | 0/3 · 1/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| firebase-live-mic-audio | firebase | compile-error | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 | 0/3 · 3/3 |
| firebase-product-image | firebase | compile-error | 0/3 · 1/3 | 1/3 · 0/3 | 0/3 · 0/3 | 0/3 · 2/3 |
| firebase-team-member-role | firebase | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| firebase-template-request | firebase | compile-error | 0/3 · 2/3 | 3/3 · 3/3 | 1/3 · 3/3 | 3/3 · 3/3 |
| firebase-vertex-region | firebase | compile-error | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| jest-fixture-path-helper | jest | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 1/3 | 0/3 · 0/3 |
| multer-file-count-upgrade | multer | type-checks | 2/3 · 3/3 | 0/3 · 2/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| multer-parts-cap-upgrade | multer | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| next-account-page-build | next | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 | 1/3 · 3/3 |
| next-bundle-tree-shaking | next | compile-error | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| next-og-share-card | next | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| next-upgrade-focus-config | next | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| nextauth-tenant-redirect | next-auth | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| nodemailer-relay-greet-pause | nodemailer | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| nodemailer-relay-reconnect | nodemailer | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| preact-activity-heatmap | preact | type-checks | 3/3 · 2/3 | 3/3 · 2/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| preact-help-shortcut | preact | type-checks | 0/3 · 0/3 | 0/3 · 1/3 | 1/3 · 0/3 | 3/3 · 3/3 |
| preact-tally-reset-all | preact | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 | 2/3 · 2/3 |
| react-crawler-render | react | type-checks | 1/3 · 3/3 | 2/3 · 2/3 | 3/3 · 3/3 | 1/3 · 2/3 |
| react-query-product-suspense | @tanstack/react-query | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 0/3 · 3/3 |
| react-query-project-loader | @tanstack/react-query | type-checks | 0/3 · 0/3 | 2/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| react-router-download-links | react-router | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| rhf-quiz-correct-answer | react-hook-form | compile-error | 1/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 2/3 · 3/3 |
| rhf-submit-error-toast | react-hook-form | compile-error | 1/3 · 3/3 | 3/3 · 1/3 | 3/3 · 3/3 | 1/3 · 3/3 |
| stripe-capability-badge | stripe | compile-error | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| stripe-card-decline | stripe | compile-error | 3/3 · 2/3 | 2/3 · 1/3 | 2/3 · 1/3 | 2/3 · 3/3 |
| stripe-card-only-checkout | stripe | compile-error | 0/3 · 0/3 | 1/3 · 2/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| stripe-order-state | stripe | compile-error | 1/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| stripe-webhook-replay | stripe | type-checks | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 | 2/3 · 3/3 |
| ts-upgrade-session-types | typescript | compile-error | 0/3 · 3/3 | 2/3 · 2/3 | 2/3 · 3/3 | 0/3 · 3/3 |
| ts-upgrade-shipping-quotes | typescript | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 0/3 · 1/3 | 0/3 · 2/3 |
| ts-upgrade-site-generator | typescript | compile-error | 2/3 · 3/3 | 3/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 |
| ts-upgrade-status-badges | typescript | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vite-admin-page-build | vite | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vitest-ci-attachments | vitest | type-checks | 0/3 · 0/3 | 3/3 · 3/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| vitest-ci-test-settings | vitest | compile-error | 3/3 · 3/3 | 3/3 · 2/3 | 3/3 · 3/3 | 0/3 · 2/3 |
| vitest-coverage-upgrade | vitest | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| vitest-dom-project-platform | vitest | type-checks | 0/3 · 0/3 | 1/3 · 1/3 | 2/3 · 2/3 | 0/3 · 3/3 |
| vitest-full-case-titles | vitest | type-checks | 0/3 · 1/3 | 0/3 · 0/3 | 0/3 · 1/3 | 1/3 · 3/3 |
| vitest-kiosk-env-teardown | vitest | type-checks | 0/3 · 1/3 | 2/3 · 2/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| vitest-list-test-names | vitest | type-checks | 0/3 · 1/3 | 0/3 · 0/3 | 1/3 · 0/3 | 0/3 · 1/3 |
| vitest-module-cache-dir | vitest | compile-error | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| vitest-restock-flow-order | vitest | compile-error | 0/3 · 3/3 | 3/3 · 3/3 | 1/3 · 3/3 | 3/3 · 3/3 |
| vitest-slug-case-names | vitest | type-checks | 3/3 · 3/3 | 3/3 · 2/3 | 3/3 · 3/3 | 3/3 · 3/3 |
| zod-typed-queue-jobs | zod | type-checks | 1/3 · 2/3 | 2/3 · 2/3 | 2/3 · 2/3 | 3/3 · 3/3 |
| zod-widget-grid-pairs | zod | type-checks | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 |
