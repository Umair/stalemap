import assert from "node:assert/strict";
import { test } from "node:test";
import { downloadUrl } from "../../src/links.ts";
import { releasePath } from "../../src/routes.ts";
test("exports downloadUrl()", () => assert.equal(typeof downloadUrl, "function"));
test("exports releasePath()", () => assert.equal(typeof releasePath, "function"));
