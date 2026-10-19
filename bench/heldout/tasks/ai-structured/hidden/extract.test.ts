import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { extractPerson } from "../../src/extract.ts";
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } };
test("returns the parsed object", async () => {
  const model = new MockLanguageModelV4({ doGenerate: async () => ({ content: [{ type: "text", text: JSON.stringify({ name: "Ada", age: 36 }) }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] }) });
  assert.deepEqual(await extractPerson(model, "Ada is 36."), { name: "Ada", age: 36 });
});
