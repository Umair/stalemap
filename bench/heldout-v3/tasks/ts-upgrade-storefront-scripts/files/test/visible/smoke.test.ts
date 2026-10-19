import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
test("the page loads the app script and mounts the cart", async () => {
  const html = await readFile(new URL("../../public/index.html", import.meta.url), "utf8");
  assert.match(html, /<script src="js\/app\.js"><\/script>/);
  assert.match(html, /Shop\.mount\(/);
});
