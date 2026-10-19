# stalemap probes

Generated 2026-10-16. A probe asks the model to write code for the pinned version and type-checks it against that version's published declarations.

| model | cutoff | probes | stale without notes | stale with notes |
|---|---|---|---|---|
| `claude-haiku-4-5` | 2025-02-28 | 12 | 10/12 (83%) | 0/11 (0%) |
| `claude-sonnet-4-5` | 2025-07-31 | 12 | 8/11 (73%) | 1/10 (10%) |
| `claude-opus-5-5` | 2026-06-30 | 3 | 2/3 (67%) | 1/3 (33%) |

### `claude-haiku-4-5`

| package | change | without notes | with notes |
|---|---|---|---|
| `next@16.4.2` | `revalidateTag()` now requires `profile` | ✗ stale | ✓ |
| `ai@7.0.142` | `CoreMessage` was removed | ✗ stale | ✓ |
| `@anthropic-ai/sdk@0.135.0` | `Anthropic`: removed `fileFromPath`, `httpAgent`, `Page`, `ModelInfosPage` | ✗ stale | ✓ |
| `openai@7.34.0` | `new OpenAI()` options no longer accept `httpAgent` | ✗ stale | ✓ |
| `zod@4.6.7` | `string()` options no longer accept `errorMap`, `invalid_type_error`, `required_error`, `description`, `coerce` | ✗ stale | ✓ |
| `@tanstack/react-query@5.104.3` | On `QueryClient`, deprecated: `ensureQueryData` (use queryClient.query({ ...options, staleTime: 'static' })), `fetchQuer | ✗ stale | ✓ |
| `next@16.4.2` | `NextMiddleware` is deprecated: Use `NextProxy` instead. Middleware has been renamed to Proxy. | ✗ stale | avoided API |
| `ai@7.0.142` | `convertToCoreMessages` was removed | ✗ stale | ✓ |
| `openai@7.34.0` | `OpenAI`: removed `fileFromPath`, `httpAgent`, `FileObjectsPage`, `ModelsPage`, `BatchesPage` | ✗ stale | ✓ |
| `zod@4.6.7` | `object()` options no longer accept `errorMap`, `invalid_type_error`, `required_error`, `description` | ✗ stale | ✓ |
| `ai@7.0.142` | `streamText()` options no longer accept `maxTokens`, `maxSteps`, `toolCallStreaming`, `experimental_generateMessageId`,  | ✓ | ✓ |
| `openai@7.34.0` | On `OpenAI`, deprecated: `videos` | ✓ | ✓ |

### `claude-sonnet-4-5`

| package | change | without notes | with notes |
|---|---|---|---|
| `next@16.4.2` | `revalidateTag()` now requires `profile` | ✗ stale | ✓ |
| `ai@7.0.142` | `CoreMessage` was removed | ✗ stale | ✓ |
| `@anthropic-ai/sdk@0.135.0` | `Anthropic`: removed `Page` | ✓ | ✓ |
| `openai@7.34.0` | On `OpenAI`, deprecated: `videos` | ✗ stale | ✓ |
| `zod@4.6.7` | `string()` options no longer accept `errorMap`, `invalid_type_error`, `required_error`, `description`, `coerce` | ✗ stale | ✓ |
| `@tanstack/react-query@5.104.3` | On `QueryClient`, deprecated: `ensureQueryData` (use queryClient.query({ ...options, staleTime: 'static' })), `fetchQuer | ✗ stale | ✓ |
| `next@16.4.2` | `NextMiddleware` is deprecated: Use `NextProxy` instead. Middleware has been renamed to Proxy. | avoided API | avoided API |
| `ai@7.0.142` | `convertToCoreMessages` was removed | ✗ stale | ✓ |
| `zod@4.6.7` | `object()` options no longer accept `errorMap`, `invalid_type_error`, `required_error`, `description` | ✗ stale | ✗ stale |
| `ai@7.0.142` | `streamText()` options no longer accept `maxTokens`, `maxSteps`, `toolCallStreaming`, `experimental_generateMessageId`,  | ✓ | ✓ |
| `zod@4.6.7` | `nativeEnum` is deprecated: This API has been merged into `z.enum()`. Use `z.enum()` instead. | ✗ stale | avoided API |
| `ai@7.0.142` | `tool()`: the `tool` argument no longer accepts `parameters`, `experimental_toToolResultContent` | ✓ | ✓ |

### `claude-opus-5-5`

| package | change | without notes | with notes |
|---|---|---|---|
| `@anthropic-ai/sdk@0.135.0` | `Anthropic`: removed `Page`, `TokenPage`, `PageCursor` | ✓ | ✓ |
| `openai@7.34.0` | On `OpenAI`, deprecated: `videos` | ✗ stale | ✗ stale |
| `@tanstack/react-query@5.104.3` | On `QueryClient`, deprecated: `ensureQueryData` (use queryClient.query({ ...options, staleTime: 'static' })), `fetchQuer | ✗ stale | ✓ |
