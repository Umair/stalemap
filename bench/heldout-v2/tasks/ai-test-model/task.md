In `src/testing.ts`, export `fakeModel(reply)` for our unit tests: a language model built with the AI SDK's test utilities that never calls a provider and makes `generateText` answer with `reply`.
