import assert from "node:assert/strict";
import { test } from "node:test";
import { searchTool } from "../../src/search-tool.ts";
test("exports searchTool", () => assert.ok(searchTool));
