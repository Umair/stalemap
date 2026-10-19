import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { BookingRequest, GroupBookingRequest } = await load("../../src/schemas.ts");

const booking = { roomId: "hall-2", checkIn: "2026-11-02", checkOut: "2026-11-05" };
const ok = (schema: any, input: unknown) => schema.safeParse(input).success as boolean;

test("group bookings take 10 to 40 guests", () => {
  assert.deepEqual(GroupBookingRequest.parse({ ...booking, guests: 12 }), { ...booking, guests: 12 });
  assert.equal(ok(GroupBookingRequest, { ...booking, guests: 10 }), true);
  assert.equal(ok(GroupBookingRequest, { ...booking, guests: 40 }), true);
  assert.equal(ok(GroupBookingRequest, { ...booking, guests: 4 }), false);
  assert.equal(ok(GroupBookingRequest, { ...booking, guests: 41 }), false);
  assert.equal(ok(GroupBookingRequest, { ...booking, guests: 12.5 }), false);
});

test("group bookings keep the check-out-after-check-in rule", () => {
  const r = GroupBookingRequest.safeParse({ ...booking, checkOut: "2026-11-01", guests: 12 });
  assert.equal(r.success, false);
  assert.ok(r.error.issues.some((i: { path: PropertyKey[] }) => i.path.join(".") === "checkOut"));
  assert.equal(ok(GroupBookingRequest, { ...booking, checkOut: booking.checkIn, guests: 12 }), false);
});

test("regular bookings are unchanged", () => {
  assert.equal(ok(BookingRequest, { ...booking, guests: 2 }), true);
  assert.equal(ok(BookingRequest, { ...booking, guests: 12 }), false);
  assert.equal(ok(BookingRequest, { ...booking, checkOut: "2026-11-01", guests: 2 }), false);
});
