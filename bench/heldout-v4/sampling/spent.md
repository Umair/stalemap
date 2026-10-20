# Spent changes

Changes that a v1, v2 or v3 task was built from. When the v4 walk reaches one of these (or the same change under another id), it is recorded as an S5 skip. v3's are population ids from its walk, including the four tasks later dropped or turned into skips (they were still built from the change). v1 and v2 had no population, so their changes are described by what each task turned on.

## v3 (population ids, from `bench/heldout-v3/sampling/walk/` outcomes `task`)

- `axios@1.16.0/fetch-enforces-length-limits` (task `axios-fetch-length-limits`)
- `axios@1.20.0/fetch-maxredirects-zero` (task `axios-download-redirects`)
- `axios@1.20.0/payloadtoolarge-deprecated` (task `axios-upload-too-large`)
- `express@5.3.0/body-parser-invalid-limit-throws` (task `express-body-limit-upgrade`)
- `jest@30.5.0/module-register-throws-in-test` (task `jest-sql-require-hook`)
- `lucide-react@1.42.0/absolute-stroke-width-deprecated` (task `lucide-crisp-strokes`)
- `lucide-react@1.42.0/icon-module-exports-icondata` (task `lucide-icon-shapes`)
- `lucide-react@1.42.0/icon-node-type-deprecated` (task `lucide-uploaded-icons`)
- `lucide-react@1.42.0/swiss-franc-icons-deprecated` (task `lucide-swiss-franc`)
- `mongoose@9.0.0/custom-method-hooks-no-callbacks` (task `mongoose-failed-logins`)
- `mongoose@9.0.0/document-id-virtual-string` (task `mongoose-change-events`)
- `mongoose@9.0.0/dovalidate-returns-promise` (task `mongoose-field-check`)
- `mongoose@9.0.0/inferrawdoctype-includes-id` (task `mongoose-user-input-type`)
- `mongoose@9.0.0/isvalidobjectid-false-for-numbers` (task `mongoose-orders-by-id-time`)
- `mongoose@9.0.0/pre-middleware-no-next` (task `mongoose-article-slug`)
- `mongoose@9.0.0/queryfilter-keys-typed` (task `mongoose-product-search`)
- `mongoose@9.0.0/skipid-boolean-param-removed` (task `mongoose-supplier-import`)
- `mongoose@9.0.0/this-type-in-default-required-validate` (task `mongoose-meetup-rules`)
- `next-auth@4.24.15/email-normalizer-nfkc` (task `nextauth-plus-address-login`)
- `next@15.5.0/image-quality-warning` (task `next-image-quality`)
- `next@16.0.0/amp-removed` (task `next-amp-removed`)
- `next@16.0.0/experimental-ppr-removed` (task `next-experimental-ppr`)
- `next@16.0.0/experimental-turbo-removed` (task `next-experimental-turbo`)
- `next@16.0.0/image-local-ip-blocked` (task `next-image-local-ip`)
- `next@16.0.0/image-maximumredirects-default-3` (task `next-image-max-redirects`)
- `next@16.0.0/metadata-route-args-async` (task `next-metadata-route-args`)
- `next@16.0.0/middleware-deprecated-for-proxy` (task `next-middleware-proxy`)
- `next@16.0.0/next-legacy-image-deprecated` (task `next-legacy-image`)
- `next@16.0.0/nextconfig-type-rejects-excess-properties` (task `next-config-custom-key`)
- `next@16.0.0/turbopack-config-keys-renamed` (task `next-turbopack-build-cache`)
- `next@16.0.0/unstable-cachelife-cachetag-stabilized` (task `next-cachelife-cachetag`)
- `next@16.0.0/unstable-rootparams-removed` (task `next-root-params`)
- `next@16.3.0/custom-server-undocumented-methods-deprecated` (task `next-custom-server-render`)
- `next@16.3.0/experimental-flags-removed-memorylimit-viewtransition` (task `next-viewtransition-flag`)
- `next@16.4.0/unrecognized-server-actions-client-errors` (task `next-unrecognized-action`)
- `openai@6.33.0/response-input-message-item-type-required` (task `openai-transcript-pending`)
- `openai@6.45.0/emitted-rejects-on-error` (task `openai-realtime-reply`)
- `typescript@6.0.2/cli-files-with-tsconfig-error` (task `ts-check-doc-examples`)
- `typescript@6.0.2/deprecate-esmoduleinterop-false` (task `ts-upgrade-express-api`)
- `typescript@6.0.2/deprecate-import-asserts` (task `ts-upgrade-json-imports`)
- `typescript@6.0.2/deprecate-moduleresolution-node10` (task `ts-commonjs-build`)
- `typescript@6.0.2/deprecate-no-default-lib-directive` (task `ts-service-worker-types`)
- `typescript@6.0.2/rootdir-default-config-dir` (task `ts-library-build-output`)
- `typescript@6.0.2/strict-default-true` (task `ts-implicit-any-first`)
- `typescript@7.0.2/js-call-argument-checking-aligned` (task `ts-upgrade-legacy-helpers`)
- `typescript@7.0.2/remove-alwaysstrict-false` (task `ts-upgrade-parcel-tracking`)
- `typescript@7.0.2/remove-baseurl` (task `ts-upgrade-path-aliases`)
- `typescript@7.0.2/remove-downleveliteration` (task `ts-upgrade-build-config`)
- `typescript@7.0.2/remove-module-amd-umd-system-none` (task `ts-upgrade-slug-library`)
- `typescript@7.0.2/remove-moduleresolution-classic` (task `ts-upgrade-browser-app`)
- `typescript@7.0.2/remove-outfile` (task `ts-upgrade-storefront-scripts`)
- `typescript@7.0.2/remove-target-es5` (task `ts-upgrade-checkout-widget`)
- `typescript@7.0.2/template-literal-unicode-code-points` (task `ts-nav-label-length`)
- `zod@4.1.0/extend-refined-object-throws` (task `zod-group-booking`)
- `zod@4.1.13/promise-output-type-wrapped` (task `zod-plugin-commands`)
- `zod@4.3.0/refine-type-predicate-narrows` (task `zod-upgrade-country-guard`)
- `zod@4.3.2/strict-object-intersection-loosened` (task `zod-signup-strict-form`)
- `zod@4.5.0/iso-datetime-requires-seconds` (task `zod-partner-event-times`)
- `zod@4.5.0/json-schema-output-changes` (task `zod-assistant-tools`)
- `zod@4.5.0/record-keys-intersection-match-typescript` (task `zod-theme-overrides`)
- `zod@4.5.0/safeparse-error-no-stack-capture` (task `zod-body-validation`)
- `zod@4.6.0/error-maps-run-on-first-error-read` (task `zod-localized-errors`)
- `zod@4.6.0/base64-email-regexes-rewritten` (task `zod-avatar-data-url`, built, then made an S6 skip by v3's review)

## v1 and v2 (by description)

Each line is what the task's stale code relied on and the change that broke it.

- v1 `ai-structured`, `ai-upgrade`, `ai6-steps` (AI SDK `ai` 5–7): `maxSteps` → `stopWhen`/step-count conditions; `maxTokens` → `maxOutputTokens`; tool `parameters` → `inputSchema`; `convertToCoreMessages`/`CoreMessage` removed or renamed; agent `instructions`/`onStepEnd` naming; structured output via `generateObject`/`Output`.
- v1 `next-cache-components`, `next-upgrade` (Next 16): `experimental.dynamicIO`/`ppr` → `cacheComponents`; `revalidateTag(tag)` needing a profile argument; `middleware` → `proxy`.
- v1 `zod-function`, `zod-issues`, `zod-record`, `zod-upgrade`, `zod41-payment` (zod 4): `z.function().args().returns()` replaced; `ZodError.errors` → `.issues`; `z.record()` needing a key schema; `required_error`/`invalid_type_error` → `error`; `z.string().creditCard()`-style helpers removed or moved.
- v2 `ai-chat-history`, `ai-test-model`, `ai-token-usage` (AI SDK 7): `response.messages` after a tool loop; `MockLanguageModelV1`/`V2` → newer mock; `promptTokens`/`completionTokens` → `inputTokens`/`outputTokens`; `cachedInputTokens` moved.
- v2 `next-image-defaults`, `next-sitemaps`, `next-smooth-scroll` (Next 16): image `qualities` and `minimumCacheTTL` defaults; `generateSitemaps` ids passed as a promise/string; `data-scroll-behavior="smooth"` needed for smooth scrolling.
- v2 `prisma-upgrade` (Prisma 7): datasource `url = env(...)` moved out of `schema.prisma` into `prisma.config.ts`.
- v2 `ts-path-alias` (TypeScript 6): `baseUrl` deprecated.
- v2 `vitest-projects` (Vitest 4): `defineWorkspace`/`workspace` and `environmentMatchGlobs` → `projects`.
- v2 `zod-derived-schema` (zod 4.3): `.pick()`/`.omit()` on a refined object throws.
