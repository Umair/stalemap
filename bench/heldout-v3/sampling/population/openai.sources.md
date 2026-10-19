# openai: sources and judgment calls

Package `openai` (repo openai/openai-node). Pinned version **7.34.0**.

## Version range

107 stable `openai` versions published after 2025-07-31 and on or before 2026-10-15, from `npm view openai time --json` (UTC dates): 5.12.0 (2025-08-05) through 5.23.2 (2025-09-29) on the 5.x line, 6.0.0 (2025-09-30) through 6.49.0 (2026-07-23), and 7.0.0 (2026-07-27) through 7.34.0 (2026-10-14). No prereleases exist in the window.

Nine versions have a changelog section and a GitHub release but were never published to npm (`npm view openai@<v>` → E404): 5.12.3, 5.13.0, 5.14.0, 6.11.0, 6.12.0, 6.30.0, 7.11.0, 7.12.0, 7.29.0 (the v7.12.1 release notes say so for 7.12.0). Anything in those sections is dated at the next npm-published version (5.15.0, 6.13.0, 6.30.1, 7.12.1, 7.30.0). None of the included entries falls in one of them.

## Sources consulted

| source | entries |
|---|---|
| `npm view openai time --json` | version list and dates |
| https://github.com/openai/openai-node/blob/v7.34.0/CHANGELOG.md, every section from 5.12.0 to 7.34.0 (lines 1–2316 of the file), read in full | 8 |
| GitHub releases for all 107 window versions (`gh api repos/openai/openai-node/releases --paginate`), bullets diffed programmatically against the changelog: identical apart from one extra chore bullet in v6.49.0 ("exclude Brewfile from language detection") and the v7.12.1 prose about 7.12.0 | 0 new |
| https://github.com/openai/openai-node/blob/v7.34.0/MIGRATION.md and the same file at v6.49.0: this is the v4→v5 guide; the only in-window edits are "Node.js 20 LTS" → "Node.js 22 LTS" under Environment requirements and link fixes | 0 new (confirms the 7.0.0 entry) |
| No v6 or v7 migration guide exists: root listings at v6.0.0, v6.49.0 and v7.0.0 contain only MIGRATION.md (v5). The "⚠ BREAKING CHANGES" sections of the v6.0.0 and v7.0.0 release notes are the only major-release notes | — |
| README.md at v5.11.0, v6.0.0, v6.49.0 and v7.34.0, diffed pairwise for upgrade notes | 0 new (see "README checks") |
| Commits and PRs opened to settle specific bullets: #2026 (7.0.0 Node 22), #1554 (embeddings base64 type), #2611 (function-call arguments done event), #2660 (remove unused handwritten code), 189410b (websocket reconnection), 836d1b4 (coerce nullable), 0206188 (ComputerTool), 9909fef (InputAudio removal), 8d6c0cd (file `detail` removal), 1f6968e (`web_search_call.results` removal), 3ae2a14 (assistants deprecated), 4424b40 (Sora deprecation), 673c618 (migrate CLI), 6f4e936 (ws protocol), e0b09da (emitted rejects), 4a118fa (empty content-length), 3faee8d (multipart serialization) | used for summaries and in-window checks |
| Pre-window baseline at v5.11.0 (2025-07-30): `src/resources/responses/responses.ts`, `src/resources/webhooks.ts`, `src/resources/` listing, `src/beta/realtime/`, `package.json`; `package.json` at v6.39.1, v6.49.0, v7.34.0; `src/beta/realtime/*.ts` at v5.20.0, v6.0.0, v7.34.0 | used to decide whether changed APIs predate the window |

Total: 8 entries: 6 `breaking`, 1 `deprecation`, 1 `default-behavior`.

## How the rules were applied

- Stainless changelog sections are "⚠ BREAKING CHANGES", "Features", "Bug Fixes", "Performance Improvements", "Chores", "Documentation", "Build System", "Refactors". Everything under "Features" with the `api:` scope that only adds endpoints, parameters, models or enum values is a feature and is left out, per the brief. Removals and renames of SDK types, fields, resources or CLI count wherever they appear.
- A great many `api:` bullets are opaque ("manual updates", "api update", "update OpenAPI spec or Stainless config", "align SDK response types with expanded item schemas", "preserve model choices and improve request handling"). They were not expanded commit by commit; an opaque bullet cannot yield an entry. This is the main limit of this population.
- Bug-fix-section bullets that change behavior were left out unless they change a default or remove/rename something; the ones that come closest are listed below so the choice can be checked.
- "Changes to APIs added inside the window" was decided by grepping the v5.11.0 sources (the last pre-window release).

## README checks

The pairwise README diffs were read for upgrade notes. Findings, none of which adds an entry:

- v5.11.0 → v6.0.0: the Realtime section drops "Beta" and the import path in the example changes from `openai/beta/realtime/websocket` to `openai/realtime/websocket`. `src/beta/realtime/` still exists at v7.34.0, is not marked `@deprecated` at any checked tag, and the package exports `./*`, so the old path still works: a new path was added (5.20.0 "ship the RealtimeGA API shape", which touched only `src/resources/realtime/*`), nothing was removed or deprecated.
- v6.49.0 → v7.34.0: Node 22 minimum (the 7.0.0 entry); `await` added to `webhooks.unwrap()`/`verifySignature()` examples, but both were already `async` at v5.11.0, so this is a docs fix; `err.request_id` → `err.requestID` and the 409 `ConflictError` row are docs corrections for properties and classes that already existed; the JSR install section is gone (see 7.3.0 below); debug logging now summarizes bodies (see 6.37.0/7.6.0 below); docs moved under `docs/`.

## Judgment calls, 5.12.0 – 5.23.2

No entries. Considered and left out:
- 5.12.2 "fix verbosity parameter location in Responses" and 5.13.1 "accurately represent shape for verbosity": `verbosity` arrived with GPT-5 in 5.12.1, inside the window.
- 5.18.0 "support api key provider functions": additive feature.
- 5.20.0 "ship the RealtimeGA API shape": adds `src/resources/realtime/*` beside the untouched beta realtime resources (commit 4286ddd touches no `beta` file). 5.20.1 "fix realtime GA types", 5.23.1 "remove beta header from GA classes", 5.18.0 "update non beta realtime websockets helpers": all on the GA surface added in the window.
- 5.20.2 "coerce nullable values to undefined": `maybeCoerceInteger/Float/Boolean` in `src/internal/utils/values.ts` now treat `null` like `undefined`; a bug fix in internal helpers.
- 5.15.0 "Add connectors support for MCP tool" is the in-window origin of `connector_id` (matters for 7.19.0 below).

## Judgment calls, 6.0.0 – 6.49.0

Included:
- `openai@6.0.0/function-call-output-union` (breaking): the one "⚠ BREAKING CHANGES" bullet of the v6 major. `ResponseFunctionToolCallOutputItem` predates the window; `ResponseCustomToolCallOutput` came with GPT-5 custom tools in 5.12.1 (in window) and is mentioned in the summary only because the bullet names both. One entry: one change (the `output` field's type) applied to two types in one release.
- `openai@6.17.0/assistants-deprecated` (deprecation): "mark assistants as deprecated" sits under Bug Fixes but adds `@deprecated` to every `client.beta.assistants` method and to the `Assistant` type (commit 3ae2a14; the same commit only reworded a docstring in `files.ts`). The Assistants API predates the window.
- `openai@6.27.0/computertool-ga-rename` (breaking): a public type rename. At v5.11.0 `ComputerTool` was the `computer_use_preview` tool; after 0206188 that interface is `ComputerUsePreviewTool` (the changelog says "ComputerUsePreview") and `ComputerTool` means the GA `computer` tool.
- `openai@6.33.0/response-input-message-item-type-required` (breaking, unsure): "make `type` required in ResponseInputMessageItem" is under Bug Fixes and type-only, but it changes a public type in a way that can break compilation, which the brief says counts. The type predates the window.
- `openai@6.40.0/migrate-cli-removed` (breaking): "remove migrate CLI" is a Chores bullet, but it deletes the package's `bin` (`openai` → `bin/cli`, present at v5.11.0 and v6.39.1, absent from v6.49.0). A removed CLI counts under the protocol; the walk may skip it as S1.
- `openai@6.45.0/emitted-rejects-on-error` (default-behavior): a Features bullet that changes what an existing method does for the same input. `src/lib/EventEmitter.ts`'s `emitted()` used to carry a `// TODO: handle errors` and never settled on error; it now rejects. This EventEmitter underlies ChatCompletionStream, the runTools runners and AssistantStream, all pre-window.

Left out:
- 6.8.0 "remove InputAudio from ResponseInputContent": at v5.11.0 `ResponseInputContent = ResponseInputText | ResponseInputImage | ResponseInputFile`; `ResponseInputAudio` joined the union inside the window (5.18.1 "manual updates for ResponseInputAudio"), so this removes an in-window addition.
- 6.28.0 "remove detail field from ResponseInputFile and ResponseInputFileContent": no `detail` on `ResponseInputFile` at v5.11.0; added and removed inside the window (re-added in 6.35.0).
- 6.34.0 "remove web_search_call.results from ResponseIncludable": not in `ResponseIncludable` at v5.11.0; added in window, removed, restored in 6.35.0.
- 6.11.0 (shipped as 6.13.0) "make model required for the responses/compact endpoint": `responses.compact` was added in 6.10.0.
- 6.26.0 "remove phase from message types" / "readd phase": `phase` was added in 6.25.0; net no change.
- 6.28.0 "match http protocol with ws protocol instead of wss" (Chores): a behavior change in `buildURL` for Responses WebSockets, which were added in 6.23.0.
- 6.35.0 "support automatic reconnection for websockets": reconnection is opt-in (`reconnect` option, "only enabled when this has a non-null value") and on the in-window Responses WebSocket class. "add support for queuing messages when waiting for a connection", "WebSockets in the browser when using simple auth": features. "correct prompt_cache_retention enum value": `prompt_cache_retention` does not exist at v5.11.0.
- 6.18.0 "do not parse responses with empty content-length" (Chores): an edge-case change in `src/internal/parse.ts` presented as internal; left out, noted here because it is a chore that changes behavior.
- 6.34.0 "update multipart form array serialization" (Chores): commit 3faee8d touches only `scripts/mock` and `scripts/test`, not the SDK.
- 6.37.0 "redact api-key headers in debug logs" (Chores) and the README's new description of debug logging: logging output only, presented as a chore.
- 6.47.0 "pass context to runTools callbacks": an added callback argument, additive. "emit stream finalization errors": a fix (errors that were swallowed are now surfaced).
- 6.9.1 "align types of input items / output items for typescript", 6.33.0 "align SDK response types with expanded item schemas": opaque type adjustments under Bug Fixes.
- 6.0.0 "compat with zod v4", 6.7.0 "add support for zod@4 schemas", 6.49.0 "accept `None` for prompt_cache_key/safety_identifier", "add standard schema support": features or loosening.
- 6.43.0 "Convert repository to pnpm", "fix TS to use `main`", 6.16.0 "add breaking change detection workflow": repository chores.
- 6.45.0 "add afterCompletion hook to runTools", "add response input items helper", "add response stream accumulator helper": features.

## Judgment calls, 7.0.0 – 7.34.0

Included:
- `openai@7.0.0/node-22-minimum` (breaking): the v7 major's only "⚠ BREAKING CHANGES" bullet (#2026). `package.json` gains `engines: {node: ">=22.0.0"}` (absent at v6.49.0); the README's Requirements section and MIGRATION.md's environment line change to Node 22. Environment-only; the walk may skip it as S4.
- `openai@7.5.0/embeddings-base64-return-type` (breaking, unsure): #1554 adds an overload so that `embeddings.create({... encoding_format: 'base64'})` resolves to `data[].embedding: string` instead of `number[]`. Under Bug Fixes and type-only, but a changed return type for an existing call, which the brief says counts. Runtime output was always a base64 string.

Left out:
- 7.5.0 "deprecate Sora video APIs": `client.videos` does not exist at v5.11.0 (added in 6.2.0, "dev day 2025 launches"), so this deprecates an in-window API.
- 7.19.0 "deprecate MCP connector_id": `connector_id` was added in 5.15.0, inside the window.
- 7.12.1 (from the unpublished 7.11.0) "correct function argument completion event fields": #2611 removes `name` from `ResponseFunctionCallArgumentsDoneEvent`, but that field was added in 6.18.0.
- 7.8.0 "clamp the workload-identity refresh buffer to the token lifetime": workload identity was added in 6.34.0.
- 7.16.0 "add per-iterator incoming event limits", "discard unread events when an iterator returns"; 7.17.0 "reject function-based API keys in WebSocket constructors"; 7.26.0 "refresh credentials on WebSocket reconnects"; 7.33.0 "align beta pagination limits and non-null parameters": all on the Responses WebSocket (6.23.0, iterators 6.33.0) or beta Agents (7.15.0) surfaces added in the window.
- 7.3.0 "remove JSR publishing" (Chores) and the README's dropped "Installation from JSR" section: a distribution-channel change (`jsr:@openai/openai` stays at 7.2.0), not an API change; treated as a repository chore. Noted because a Deno user following the old README would be affected.
- 7.3.0 "remove root-level provider guides", "organize SDK guides": docs.
- 7.8.0 "add default WebSocket User-Agent and audit log events": a header newly sent by default on WebSocket connections, presented as a feature; left out as additive.
- 7.6.0 "support named data-residency endpoints", the X.509 and `auth:` features: additive.
- Bug-fix-section behavior changes left out as fixes, listed because they come closest to counting: 7.5.0 "reject with OpenAIError when the stream emits an error event" (#2021), "prevent deployment path traversal", "reject non-object Zod v3 strict schema roots"; 7.6.0 "support only provably JSON-native structured outputs" (#2396, may reject Zod schemas that were accepted before), "prevent structured-output format downgrade", "require an exact SSE completion sentinel"; 7.8.0 "detect multipart bodies from own properties only"; 7.9.0 "prevent Responses WebSockets from following redirects"; 7.11.0 (→7.12.1) "treat a cancelled vector store file as terminal", "reject zero batch upload concurrency", "follow next cursors through empty pages", "parse JSON media types case-insensitively"; 7.17.0 "reject unfinished turns in streaming runTools" (#2716); 7.24.0 "preserve base URL queries when joining relative endpoints".
- 7.11.0 (→7.12.1) "clarify Response types and remove unused handwritten code" (#2660): touches tests, a vendored parser and `src/core/streaming.ts` dead code only; no export removed.
- 7.7.0 "make function call output call IDs optional", 7.26.0 "allow original image detail in Chat Completions": loosening.
- The `deps-dev`/`deps`/`ci`/`build`/`lint`/`examples`/`test`/`docs` bullets (the bulk of 7.5.0, 7.6.0 and 7.11.0): tooling, examples and dependency bumps, none marked breaking.
