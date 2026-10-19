In `src/search-tool.ts`, export `searchTool`: an AI SDK tool (from the `ai` package) the model can call to search our docs.

- Input: `{ query: string; limit?: number }`, validated with zod. `limit` defaults to 5.
- It returns `limit` results: `{ title: "<query> #<n>" }` for n = 1..limit (for example `{ title: "zod #1" }`).
