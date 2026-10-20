# openai: sources and judgment calls

Package `openai` (repo openai/openai-node). Pinned version **7.39.0**.

## Version range

43 stable versions published after 2026-06-30 and on or before 2026-10-19 (`npm view openai time --json`, UTC dates): 6.46.0 (2026-07-09), 6.47.0, 6.48.0, 6.49.0 (2026-07-23) on the 6.x line, then 7.0.0 (2026-07-27) through 7.39.0 (2026-10-19). No prereleases. 7.11.0, 7.12.0 and 7.29.0 have changelog sections and GitHub releases but were never published to npm; their contents are dated at the next published version (7.12.1, 7.30.0).

Pre-window baseline (the last release before 2026-07-01): **6.45.0** (2026-06-24). An API counts as "added inside the window" if it is absent from 6.45.0.

## Sources consulted

| source | entries |
|---|---|
| `npm view openai time --json` | version list and dates |
| https://github.com/openai/openai-node/blob/v7.39.0/CHANGELOG.md, every section from 6.46.0 to 7.39.0, read in full (dependency-bump bullets skimmed) | 7 (node-22, embeddings base64, Sora deprecation, MCP error, parsed tool calls, `name` removal, connector_id) |
| GitHub releases for all 46 in-window tags (`gh api repos/openai/openai-node/releases --paginate`), bullets diffed programmatically against the changelog sections: identical apart from one chore bullet in v6.49.0 ("exclude Brewfile from language detection") | 0 new |
| MIGRATION.md at v7.39.0: still the v4→v5 guide; unchanged between v7.34.0 and v7.39.0 (compare API). No v7 migration guide exists; the 7.0.0 release notes' "⚠ BREAKING CHANGES" section is the only major-release note | 0 new |
| Published type declarations of all 44 npm tarballs 6.45.0 … 7.39.0, parsed with the TypeScript compiler API and diffed version to version (removed declarations/properties, narrowed types, optional→required, newly added `@deprecated` tags), then filtered to symbols that exist in 6.45.0 | 4 entries the changelog does not name (prompt_cache_retention, geography, legacy image params, image `user`) and confirmation of the rest |
| Commits opened to settle specific bullets: 6c397d5 (6.46.0 gpt-5.6-sol updates), 34acd23/3188968 (6.48.0 manual updates), 4424b40 (Sora), a3deafb (Ultrafast/structured MCP errors/separate WS events), 156a8db, 602d481, 94ecdc4 (7.10.0), 4908505 (7.9.0), 31bf7e7 (function-call args done), 645c5ad (connector_id), a4a4396 (7.21.0), 76e4456 (iterator limits), 4ae463a (7.33.0 beta pagination), 26d8158 (project residency), 11b9283 (7.28.0), c95ccaf (7.36.0), 648cd0a (GPT-4 shutdown notices) | used for summaries and in-window checks |
| v3's `bench/heldout-v3/sampling/population/openai.jsonl` / `.sources.md` (window 2025-08 … 2026-10-15) | ids reused for 7.0.0/node-22-minimum and 7.5.0/embeddings-base64-return-type; v3's 6 pre-July entries dropped |

Total: **11 entries**: 5 `breaking`, 6 `deprecation`, 0 `default-behavior`.

## v3 reuse

- Reused ids (same change, first stable release in the v4 window): `openai@7.0.0/node-22-minimum`, `openai@7.5.0/embeddings-base64-return-type`.
- Dropped (dated before 2026-07-01): 6.0.0 function-call-output-union, 6.17.0 assistants-deprecated, 6.27.0 computertool-ga-rename, 6.33.0 response-input-message-item-type-required, 6.40.0 migrate-cli-removed, 6.45.0 emitted-rejects-on-error.
- **The v4 window starts later than v3's, so several APIs v3 treated as "added inside the window" (added 2025-08 … 2026-06) are pre-window for v4.** That turns three of v3's exclusions into v4 entries: the 7.5.0 Sora deprecation (`client.videos` added 6.2.0), the 7.19.0 `connector_id` deprecation (added 5.15.0) and the 7.11.0→7.12.1 removal of `name` from `ResponseFunctionCallArgumentsDoneEvent` (added 6.18.0). The same shift brings the Responses WebSocket surface (6.23.0) into scope; none of its in-window changes is an entry (see below).

## Judgment calls

Included:
- `6.46.0/prompt-cache-retention-deprecated` (deprecation, **unsure**): the changelog says only "gpt-5.6-sol updates"; the type diff shows `@deprecated Deprecated. Use prompt_cache_options.ttl instead.` added to `prompt_cache_retention` on ChatCompletionCreateParams, ResponseCreateParams, ResponseCompactParams, the Responses WS create event and `Response`. The parameter exists at 6.45.0. Included because a public option became deprecated, though the notes don't say so in words.
- `7.5.0/sora-videos-deprecated` (deprecation): "deprecate Sora video APIs"; `@deprecated` on the `Videos` class, `client.videos` and every method.
- `7.5.0/mcp-call-error-structured` (breaking): from "structured MCP and websocket errors" (a Features bullet, commit a3deafb). `McpCall.error` was `string | null` at 6.45.0 and is the object union `McpToolCallError` from 7.5.0. A changed type of an existing public field.
- `7.5.0/parsed-tool-calls-include-custom` (breaking, **unsure**): from the Bug Fixes bullet "chat: support custom tool calls in parser and ChatCompletionStream". `ParsedChatCompletionMessage.tool_calls` widens from `ParsedFunctionToolCall[]` to `(ParsedFunctionToolCall | ChatCompletionMessageCustomToolCall)[]` (and the stream snapshot's `ToolCall` becomes a union). Type-only and in a fix section, but code that reads `.function` on each call stops compiling; included on the same footing as v3's 6.0.0 output-union entry.
- `7.6.0/project-geography-deprecated` (deprecation, **unsure**): changelog "Add project residency and usage quantity_unit fields"; the types add `@deprecated ... use residency instead` to `geography` on admin project create/update. Admin projects API exists at 6.45.0.
- `7.12.1/function-call-arguments-done-name-removed` (breaking): 7.11.0 (unpublished) Features bullet "correct function argument completion event fields" (#2611); `name: string` removed from `ResponseFunctionCallArgumentsDoneEvent` (and the beta copy). The field is in 6.45.0.
- `7.19.0/mcp-connector-id-deprecated` (deprecation): Chores bullet "deprecate MCP connector_id"; `@deprecated` on `Tool.Mcp.connector_id` and the Realtime MCP tool configs.
- `7.28.0/legacy-image-params-deprecated` (deprecation, **unsure**): the changelog bullet is "add custom voice creation and agent session events", but commit 11b9283 adds `@deprecated` to `images.createVariation()`, `response_format` (generate and edit) and `style` (generate), all present in 6.45.0. One entry: deprecations of legacy DALL-E image options in one release.
- `7.36.0/image-user-param-deprecated` (deprecation): "add safety identifiers to image requests and responses" adds `safety_identifier` and marks `user` on images.generate/edit `@deprecated ... use safety_identifier instead`.

Left out:
- 6.46.0 (gpt-5.6-sol updates) adds `client.beta.responses` and `SafetyIdentifierBlockedWebhookEvent`; 6.47.0 removes `SafetyIdentifierBlockedWebhookEvent` from the webhook types and `UnwrapWebhookEvent`: added and removed inside the window. All later beta-Responses changes (6.48.0 annotation union members, etc.) are on the in-window `client.beta.responses` surface.
- 6.47.0 zod helper generics (`ZodTypeLike` instead of `z3.ZodType | z4.ZodType`), runTools `toolContext` overloads, "pass context to runTools callbacks": loosening/additive. "emit stream finalization errors": fix.
- 6.48.0 "manual updates" (x2): `admin/organization/projects/service-accounts.ts` becomes a directory (`service-accounts/`), the old module re-exports it; no export lost. The audit-log `event_types` change only adds values.
- 7.3.0 "remove JSR publishing": distribution channel, treated as a chore (as in v3).
- 7.5.0 "separate websocket events" (a3deafb/156a8db): `ResponsesServerEvent` (Responses WebSocket mode, pre-window) is re-expressed as WS-specific event interfaces carrying `stream_id`, and `WebSocketError.error` is typed `WebSocketErrorEvent`. Event `type` discriminants are unchanged; considered a re-typing of the same events, not a removal. Borderline; listed here so it can be reconsidered.
- 7.5.0 `service_tier`/`detail` unions replaced by named aliases `ServiceTier`/`ImageDetail` with the same members; `ResponseOutputTextAnnotationAddedEvent.annotation` goes from `unknown` to a typed union (narrower output, no consumer breakage).
- 7.5.0 bug fixes that change behavior (as in v3): "reject with OpenAIError when the stream emits an error event", "finish SSE streams immediately after [DONE]", the many `security:` fixes; 7.6.0 "zod: support only provably JSON-native structured outputs" (#2396, may reject schemas accepted before), "require an exact SSE completion sentinel". Bug-fix sections, not presented as changes.
- 7.8.0 "add default WebSocket User-Agent" (additive header); "clamp the workload-identity refresh buffer" and the X.509 `refreshBufferMs` deprecation: workload identity/X.509 added in the window (X.509 in 7.6.0).
- 7.9.0 "update usage APIs": `compute_units` was added in 7.8.0 and reshaped in 7.9.0 (in-window).
- 7.10.0 (gpt-6-astra): `ResponsesClientEvent` changes from one interface to the union `ResponseCreate | ResponseSteerEvent`; existing `response.create` objects still type-check (a new variant added). Left out as additive, noted as borderline.
- 7.14.0 Live API and its `LiveCallIncomingWebhookEvent` deprecation: in-window surface.
- 7.15.0 onward: Agents API (`client.beta.agents`, 7.15.0) and Live (7.14.0) changes, incl. 7.33.0 "align beta pagination limits and non-null parameters" (beta agents only, commit 4ae463a).
- 7.16.0 "add per-iterator incoming event limits": opt-in (`maxBufferedEvents`, "omission preserves unlimited buffering"). "discard unread events when an iterator returns", 7.17.0 "reject function-based API keys in WebSocket constructors", 7.26.0 "refresh credentials on WebSocket reconnects", 7.30.1 "parse structured text only in final message phases": bug-fix-section changes, left out as fixes (the Responses WS surface is pre-window for v4, so these come closest).
- 7.19.0 `AdminAPIKeyListParams` now `Omit<CursorPageParams,'after'>` plus its own `after?: string | null`: loosening.
- 7.21.0 "preserve model choices and improve request handling": reorders `gpt-5.1-mini` in a model union; request-option plumbing; no removal.
- 7.35.0 refactors remove private members (`_reconnect`, `_sendQueue`, …) of `ResponsesWSBase`: private, not public API. 7.39.0 realtime recovery: opt-in.
- 7.37.0 "add shutdown notices for GPT-4 model aliases" (648cd0a): doc-comment shutdown dates for gpt-4.1/gpt-4o aliases; no `@deprecated` tag, types and runtime unchanged.
- `deps`/`deps-dev`/`ci`/`docs`/`examples`/`test` bullets: tooling and dependency bumps, none marked breaking.

Limits: opaque `api:` bullets were checked through the type-declaration diff, which sees removed or narrowed types and new `@deprecated` tags but not runtime behavior changes hidden behind an opaque bullet.
