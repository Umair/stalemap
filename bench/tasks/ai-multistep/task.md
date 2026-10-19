Implement `answer` in `src/answer.ts` using the AI SDK (`ai` package):

- Define a `getWeather` tool. Its input is `{ city: string }`, validated with zod. It returns `{ city, forecast: "sunny" }`.
- `answer(model, question)` calls `generateText` with the `getWeather` tool and lets the model keep going for up to 5 steps, so it can call the tool and then answer. Return the final text.
