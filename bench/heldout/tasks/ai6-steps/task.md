Implement `runAgent(model, question)` in `src/agent.ts` with the AI SDK (`ai` package):

- System prompt: "You are a weather assistant."
- A `getWeather` tool: input `{ city: string }` validated with zod; it returns `{ city, forecast: "sunny" }`.
- Let the model take up to 4 steps, and count the tool calls across all steps with the SDK's per-step callback.
- Return `{ text, toolCalls }`.
