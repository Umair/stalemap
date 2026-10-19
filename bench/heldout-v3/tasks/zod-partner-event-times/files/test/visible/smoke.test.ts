import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePartnerEvents } from "../../src/calendar.ts";
test("exports parsePartnerEvents()", () => assert.equal(typeof parsePartnerEvents, "function"));
