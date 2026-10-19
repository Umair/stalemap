import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = join(import.meta.dirname, "..");

test("stalemap mcp lists its tools and answers check_notes offline", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", join(root, "src/cli.ts"), "mcp", "--cwd", join(root, "test/fixtures/next-ai-app")],
    cwd: root,
    stderr: "pipe",
  });
  const client = new Client({ name: "stalemap-test", version: "0.0.0" });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ["check_notes", "package_changes", "project_changes", "search_changes"]);
    const search = tools.find((t) => t.name === "search_changes")!;
    assert.deepEqual(search.inputSchema.required, ["query"]);
    assert.match(search.description ?? "", /even when you're sure/);
    assert.match(client.getInstructions() ?? "", /Call search_changes before you write or change code/);
    assert.ok(tools.find((t) => t.name === "package_changes")?.inputSchema.required?.includes("name"));

    // --cutoff keeps this offline: no model catalog lookup, and check doesn't touch the registry.
    const res = await client.callTool({ name: "check_notes", arguments: { cutoff: "2025-07-31" } });
    const body = (res.content as Array<{ type: string; text: string }>)[0].text;
    assert.match(body, /AGENTS\.md has no stalemap block/);
  } finally {
    await client.close();
  }
});
