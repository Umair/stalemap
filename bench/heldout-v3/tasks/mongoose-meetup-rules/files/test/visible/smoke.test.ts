import assert from "node:assert/strict";
import { test } from "node:test";
import { Meetup } from "../../src/models/meetup.ts";
test("exports the Meetup model", () => assert.equal(typeof Meetup, "function"));
