import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { Meetup } = await load("../../src/models/meetup.ts");

const startsAt = new Date("2026-03-04T18:00:00Z");
const errorsOf = async (doc: any): Promise<Record<string, any>> => {
  try {
    await doc.validate();
    return {};
  } catch (err: any) {
    return err?.errors ?? { _: err };
  }
};

test("endsAt defaults to two hours after startsAt", async () => {
  const doc = new Meetup({ title: "TS night", startsAt, venue: "Hall A" });
  assert.deepEqual(Object.keys(await errorsOf(doc)), []);
  assert.equal(new Date(doc.endsAt).getTime(), startsAt.getTime() + 2 * 60 * 60 * 1000);
});

test("an explicit endsAt is kept", async () => {
  const endsAt = new Date("2026-03-04T19:30:00Z");
  const doc = new Meetup({ title: "TS night", startsAt, endsAt, online: true });
  assert.equal(new Date(doc.endsAt).getTime(), endsAt.getTime());
  assert.deepEqual(Object.keys(await errorsOf(doc)), []);
});

test("a meetup must end after it starts", async () => {
  for (const endsAt of [new Date("2026-03-04T17:00:00Z"), startsAt]) {
    const errors = await errorsOf(new Meetup({ title: "Backwards", startsAt, endsAt, online: true }));
    assert.deepEqual(Object.keys(errors), ["endsAt"]);
    assert.equal(errors.endsAt.message, "A meetup must end after it starts");
  }
});

test("in-person meetups need a venue, online ones don't", async () => {
  assert.deepEqual(Object.keys(await errorsOf(new Meetup({ title: "Pizza", startsAt }))), ["venue"]);
  assert.deepEqual(Object.keys(await errorsOf(new Meetup({ title: "Pizza", startsAt, online: false }))), ["venue"]);
  assert.deepEqual(Object.keys(await errorsOf(new Meetup({ title: "Stream", startsAt, online: true }))), []);
});

test("other schema rules still apply", async () => {
  const errors = await errorsOf(new Meetup({ startsAt, online: true }));
  assert.deepEqual(Object.keys(errors), ["title"]);
});
