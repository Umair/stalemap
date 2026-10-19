import assert from "node:assert/strict";
import { test } from "node:test";
import { withSecurityHeaders } from "../../src/with-security-headers.ts";
test("exports withSecurityHeaders()", () => assert.equal(typeof withSecurityHeaders, "function"));
