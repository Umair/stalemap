import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
const load = (id: string): Promise<any> => import(id);

const stripe = new Stripe("sk_test_123");
const secret = "whsec_test_replay_secret";
const now = Math.floor(Date.now() / 1000);

function delivery(id: number, ageSeconds: number, opts: { signWith?: string; tamper?: boolean } = {}) {
  const event = { id: `evt_${id}`, object: "event", type: "invoice.paid", api_version: "2026-09-30.endive", created: now - ageSeconds, data: { object: { id: `in_${id}`, object: "invoice" } } };
  const payload = JSON.stringify(event, null, 2);
  const timestamp = now - ageSeconds;
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: opts.signWith ?? secret, timestamp });
  return { id, payload: opts.tamper ? payload.replace("invoice.paid", "invoice.voided") : payload, signature, receivedAt: new Date(timestamp * 1000) };
}

test("returns the event from a fresh delivery", async () => {
  const { verifiedEvent } = await load("../../src/replay.ts");
  const event = verifiedEvent(stripe, delivery(1, 5), secret);
  assert.equal(event.id, "evt_1");
  assert.equal(event.type, "invoice.paid");
});

test("returns the event from a delivery stored days ago", async () => {
  const { verifiedEvent } = await load("../../src/replay.ts");
  const event = verifiedEvent(stripe, delivery(2, 3 * 24 * 3600), secret);
  assert.equal(event.id, "evt_2");
  assert.equal(event.data.object.id, "in_2");
});

test("throws for a tampered body or a different secret", async () => {
  const { verifiedEvent } = await load("../../src/replay.ts");
  assert.throws(() => verifiedEvent(stripe, delivery(3, 3 * 24 * 3600, { tamper: true }), secret));
  assert.throws(() => verifiedEvent(stripe, delivery(4, 60, { tamper: true }), secret));
  assert.throws(() => verifiedEvent(stripe, delivery(5, 3 * 24 * 3600, { signWith: "whsec_someone_else" }), secret));
});

test("the replay job handles old deliveries and rejects forged ones", async () => {
  const { replayDeliveries } = await load("../../src/replayJob.ts");
  const handled: string[] = [];
  const rejected = await replayDeliveries(
    stripe,
    [delivery(6, 2 * 24 * 3600), delivery(7, 2 * 24 * 3600, { signWith: "whsec_forged" }), delivery(8, 600)],
    secret,
    async (event: { id: string }) => {
      handled.push(event.id);
    },
  );
  assert.deepEqual(handled, ["evt_6", "evt_8"]);
  assert.deepEqual(rejected, [7]);
});
