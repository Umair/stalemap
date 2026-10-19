import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import * as mod from "../../src/format.ts";
const formatError = (mod as Record<string, any>).formatError;
test("one line per issue", () => {
  const r = z.object({ name: z.string(), address: z.object({ zip: z.string().min(5, "Too short") }) }).safeParse({ address: { zip: "1" } });
  assert.equal(r.success, false);
  const lines: string[] = formatError(r.error);
  assert.ok(lines.includes("address.zip: Too short"), lines.join(" | "));
  assert.ok(lines.some((l) => l.startsWith("name: ")), lines.join(" | "));
  const root = z.string().safeParse(1);
  assert.ok(formatError(root.error)[0].startsWith("(root): "));
});
