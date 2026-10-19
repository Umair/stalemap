import assert from "node:assert/strict";
import { test } from "node:test";
import * as schemas from "../../src/schemas.ts";
test("exports BookingRequest and GroupBookingRequest", () => {
  assert.equal(typeof schemas.BookingRequest.safeParse, "function");
  assert.equal(typeof (schemas as Record<string, any>).GroupBookingRequest?.safeParse, "function");
});
