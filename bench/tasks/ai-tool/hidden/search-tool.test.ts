import assert from "node:assert/strict";
import { test } from "node:test";
import { searchTool } from "../../src/search-tool.ts";

test("searchTool declares its input schema and returns results", async () => {
  const t = searchTool as unknown as { inputSchema?: unknown; execute?: (input: unknown, options: unknown) => Promise<unknown> };
  assert.ok(t && t.inputSchema, "the tool defines inputSchema");
  assert.equal(typeof t.execute, "function");
  assert.deepEqual(await t.execute!({ query: "zod", limit: 2 }, { toolCallId: "1", messages: [] }), [{ title: "zod #1" }, { title: "zod #2" }]);
});
