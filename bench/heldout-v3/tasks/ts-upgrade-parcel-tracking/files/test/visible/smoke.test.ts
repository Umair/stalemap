import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
test("the page loads the tracking scripts and mounts the list", async () => {
  const html = await readFile(new URL("../../public/index.html", import.meta.url), "utf8");
  for (const script of ["parcels", "carriers", "page"]) assert.match(html, new RegExp(`<script src="js/${script}\\.js"></script>`));
  assert.match(html, /Tracking\.mount\(/);
});
