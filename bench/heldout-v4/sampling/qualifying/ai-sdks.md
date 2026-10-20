# Qualifying: AI and API SDKs

Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Candidates walked in rank order until 4 qualified.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | openai | 7.39.0 | qualifies | 7.0.0 (2026-07-27) opens a new semver-major line (its "⚠ BREAKING CHANGES": Node.js 22 minimum) |
| 2 | stripe | 23.0.0 | qualifies | 23.0.0 (2026-10-01) opens a new semver-major line (Node 20 minimum, `Stripe.ErrorType` removed, `verifyHeader` default tolerance, and more, per the v23 migration guide) |
| 3 | @google/genai | 2.30.0 | qualifies | 2.11.0 (2026-07-09), "Code Refactoring": `refactor(interactions)!` removes `cached_content`, `presence_penalty` and `frequency_penalty` from the Interactions API (commit footer "BREAKING CHANGE") |
| 4 | @modelcontextprotocol/sdk | 1.32.1 | qualifies | 1.32.0 (2026-10-02), "Upgrade notes": the HTTP client transports now follow a redirect only when it stays on the same origin (cross-origin redirects need `redirectPolicy`), a behavior change for the same input |

Stopped after 4 qualified. Not examined: @aws-sdk/client-s3, ai, @anthropic-ai/sdk, langchain (with @langchain/core), @sentry/node.

Top 3 (population built): openai, stripe, @google/genai. Fourth: @modelcontextprotocol/sdk (no population built).

Judgment calls:
- @modelcontextprotocol/sdk is read through the v1.x line's GitHub releases (tags `1.30.0`–`1.32.1`); the repository also publishes the v2 split packages (`@modelcontextprotocol/server` 2.x etc.), which are different npm packages and were not used.
