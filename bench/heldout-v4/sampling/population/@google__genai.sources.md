# @google/genai: sources and judgment calls

Package `@google/genai` (repo googleapis/js-genai). Pinned version **2.30.0**.

## Version range

22 stable versions published after 2026-06-30 and on or before 2026-10-19 (`npm view @google/genai time --json`, UTC): 2.11.0 (2026-07-09), 2.12.0, 2.13.0, 2.14.0 (2026-07-29), 2.15.0, 2.16.0, 2.17.0, 2.17.1, 2.18.0, 2.19.0, 2.20.0, 2.21.0, 2.22.0, 2.23.0, 2.24.0, 2.25.0, 2.26.0, 2.27.0, 2.28.0, 2.29.0, 2.29.1, 2.30.0 (2026-10-15). No prereleases, no major release in the window (so no migration guide applies). Dates are npm publish dates; some changelog headings are a day earlier. Pre-window baseline: 2.10.0 (2026-06-24).

## Sources consulted

| source | entries |
|---|---|
| `npm view @google/genai time --json` | version list and dates |
| https://github.com/googleapis/js-genai/blob/v2.30.0/CHANGELOG.md, sections 2.11.0 – 2.30.0, read in full | 5 (interactions refactor, Imagen/video deprecation warnings, per-attempt timeout, allowlist shape, default timeouts) plus `call_id` removal |
| GitHub releases v2.11.0 … v2.30.0 (`gh api repos/googleapis/js-genai/releases --paginate`), bullets diffed against the changelog: identical except one wording variant in 2.13.0 (`custom_vocabulary` "added to Live API") | 0 new |
| Published `dist/genai.d.ts` of all 23 tarballs 2.10.0 … 2.30.0, parsed with the TypeScript compiler API and diffed version to version (removed declarations/fields/exports, narrowed types, new `@deprecated`), filtered to names present in 2.10.0; the `dist/node/index.mjs` bundles grepped for runtime deprecation warnings | 4 entries the changelog does not name (Arguments/RetrievalType, response_modalities, StreamMetadata, Turn) and confirmation of the rest |
| Commits 0f414be (interactions refactor, `refactor(interactions)!` with a BREAKING CHANGE footer), bb66101 (deprecation warnings), 8268806 (per-attempt timeout), 10e850c (default timeouts), aeb7453 (FunctionResultDelta), 18bc392 (allowlist), b9dfd81 (2.16.0 errors array) | summaries and in-window checks |

Total: **10 entries**: 6 `breaking`, 2 `deprecation`, 2 `default-behavior`.

## Judgment calls

Included:
- `2.11.0/interactions-penalties-cached-content-removed` (breaking): the "Code Refactoring" bullet is a `refactor(interactions)!` commit with "BREAKING CHANGE: Not supporting cached_content, presence_penalty, frequency_penalty". In the published types the penalties disappear in 2.11.0 while `cached_content` lingers on `CreateModelInteraction`/`Interaction` until 2.12.0; kept as one entry dated at 2.11.0, the release that shipped the commit.
- `2.11.0/interactions-arguments-retrievaltype-types-removed` (breaking, **unsure**): not in the notes; the `Interactions` namespace export list drops `Arguments` and `RetrievalType` in 2.11.0 (both in 2.10.0). Type-only renames inside an evolving API.
- `2.14.0/imagen-and-video-args-deprecated` (deprecation): Bug Fixes bullet "add deprecation warnings to Imagen generate_images, edit_images, generate_videos (if using prompt/text/image args), LiveConnectConfig.GenerationConfig". The `console.warn` calls for generateImages, editImage and generateVideos-with-prompt/image/video first appear in 2.14.0; the LiveConnectConfig `generation_config` warning already exists in 2.10.0, so it is not part of the entry. No `@deprecated` JSDoc tag is added (the walk may apply S7 unless the runtime warning is checkable).
- `2.16.0/http-timeout-per-attempt` (default-behavior): Features bullet "Make HttpOptions.timeout a per-attempt deadline"; the same option now means something else for the same input.
- `2.16.0/interactions-response-modalities-deprecated` (deprecation, **unsure**): not in the notes; `@deprecated field: This will be removed in a future release` added to `response_modalities` (present in 2.10.0).
- `2.16.0/interactions-stream-metadata-removed` (breaking, **unsure**): not in the notes (2.16.0 says "Add top-level errors array to Interaction resource"); the types drop `StreamMetadata` and the `metadata` field from the Interactions SSE event types.
- `2.17.1/interactions-turn-types-removed` (breaking): 2.17.1's only note is "Add gemini-3.7-flash", but the `Turn`/`TurnContent` types (already `@deprecated` in 2.10.0) are removed from the exports.
- `2.22.0/function-result-delta-call-id-removed` (breaking): Bug Fixes bullet "Remove unused field from FunctionResultDelta"; removing a public type's field counts regardless of section.
- `2.28.0/environment-allowlist-shape` (breaking): "Support `"allowlist": "disabled"`" also changes the `Allowlist` type from an object wrapper to `AllowlistEntry[] | Disabled` (the object form existed in 2.10.0).
- `2.29.0/default-http-timeouts-raised` (default-behavior): Bug Fixes bullet "Raise default HTTP timeouts so long-running requests aren't killed client-side", a changed default; commit 10e850c replaces the undici-timeout bumping with a dispatcher that does not apply undici's default headers/body timeouts.

Left out:
- Additions to the Interactions API made inside the window and then changed (all on types absent from 2.10.0): `TranscriptionConfig` (2.13.0) and its 2.19.0 `diarization_mode`/`timestamp_granularities` deprecations; the Live `InteractionStatus` enum (2.17.0) and 2.18.0 "mark REQUIRES_ACTION as deprecated"; Triggers (2.12.0) and 2.25.0 "use CreateAgentInteraction for Trigger.interaction"; environments (2.15.0) and 2.29.0 "Update EnvironmentConfig.env schema"; continuation tokens (2.26.0/2.27.0) and 2.29.0 "automatically consume the continuation token"; credentials (2.23.0).
- Changes that are undone before the pinned version: 2.14.0 drops `temperature`/`top_p` from the Interactions `GenerationConfig` and `language_hints` from `TranscriptionConfig`; all are back in 2.30.0 (net no change).
- Name collisions produced by the bundled declaration file (`AudioResponseFormat`, `TextResponseFormat`, `WordInfo` etc. in 2.11.0/2.14.0): new top-level GenerateContent classes; the Interactions types of the same name remain exported under the `Interactions` namespace.
- 2.29.0 webhook request types (`body` required, `ping`/`rotateSigningSecret` argument order) on the internal generated `Webhooks_2` class, which is not in 2.10.0; the public `client.webhooks` (`GeminiNextGenWebhooks`) methods keep compatible parameter shapes. 2.30.0 "type GeminiNextGen signatures with public, importable names": parameter/return types renamed to namespace-qualified equivalents with the same shapes.
- 2.29.0 "remove unsupported 2.5 and 1.6 models from Interactions model options" (CLI): the Interactions `Model` union is open (`string & {}`) and loses no value in the types.
- 2.20.0 "Don't set redundant Content-Length on file upload requests", 2.29.0/2.29.1/2.30.0 continuation and streaming fixes, 2.19.0 tokenizer performance: fixes and performance.
- Everything else: features (new models, fields, resources, enum values).
