import assert from "node:assert/strict";
import { test } from "node:test";
import sitemap from "../../app/sitemap.ts";
test("app/sitemap.ts exports a sitemap function", () => assert.equal(typeof sitemap, "function"));
