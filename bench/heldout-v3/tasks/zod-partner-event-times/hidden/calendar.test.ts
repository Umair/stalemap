import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { parsePartnerEvents } = await load("../../src/calendar.ts");

const event = (start: string, end = "2026-03-01T18:00:00Z") => ({ id: "e1", title: "Standup", start, end });
const startOf = (s: string) => {
  const [e] = parsePartnerEvents([event(s)]);
  assert.ok(e.start instanceof Date);
  return e.start.toISOString();
};

test("timestamps with seconds", () => {
  assert.equal(startOf("2026-03-01T09:30:15.250+01:00"), "2026-03-01T08:30:15.250Z");
  assert.equal(startOf("2026-03-01T09:30:00Z"), "2026-03-01T09:30:00.000Z");
});

test("timestamps without seconds", () => {
  assert.equal(startOf("2026-03-01T09:30+01:00"), "2026-03-01T08:30:00.000Z");
  assert.equal(startOf("2026-03-01T08:30Z"), "2026-03-01T08:30:00.000Z");
  const [e] = parsePartnerEvents([event("2026-03-01T09:30-05:00", "2026-03-01T10:15-05:00")]);
  assert.deepEqual([e.id, e.title, e.start.toISOString(), e.end.toISOString()], ["e1", "Standup", "2026-03-01T14:30:00.000Z", "2026-03-01T15:15:00.000Z"]);
});

test("anything else throws", () => {
  for (const bad of ["2026-03-01T09:30", "2026-03-01T09:30:00", "2026-03-01", "tomorrow at 9", "2026-13-01T09:30Z"]) {
    assert.throws(() => parsePartnerEvents([event(bad)]), Error, bad);
  }
  assert.throws(() => parsePartnerEvents([{ id: "e1", title: "Standup", start: "2026-03-01T09:30Z" }]));
});
