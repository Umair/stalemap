import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("publishPost refreshes the posts cache tag", () => {
  const src = readFileSync(new URL("../../src/actions.ts", import.meta.url), "utf8");
  assert.match(src, /\b(revalidateTag|updateTag)\(\s*["'`]posts["'`]/, "calls revalidateTag/updateTag with the posts tag");
  assert.match(src, /savePost\(/);
});
