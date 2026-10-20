import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import Stripe from "stripe";
const load = (id: string): Promise<any> => import(id);

// A local stand-in for the Stripe API that returns a payment intent in the status named by its id.
const server = http.createServer((req, res) => {
  const status = decodeURIComponent((req.url ?? "").split("/").pop()!.split("?")[0]).replace(/^pi_/, "");
  res.writeHead(200, { "Content-Type": "application/json", "Request-Id": "req_test" });
  res.end(JSON.stringify({ id: `pi_${status}`, object: "payment_intent", amount: 4200, currency: "eur", status, livemode: false }));
});
let stripe: Stripe;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  stripe = new Stripe("sk_test_123", { host: "127.0.0.1", port: (server.address() as AddressInfo).port, protocol: "http", maxNetworkRetries: 0 });
});
after(() => server.close());

const expected: Record<string, string> = {
  succeeded: "paid",
  processing: "pending",
  requires_capture: "pending",
  requires_payment_method: "action_needed",
  requires_confirmation: "action_needed",
  requires_action: "action_needed",
  canceled: "canceled",
};

test("maps each payment intent status as documented", async () => {
  const { orderState } = await load("../../src/orders.ts");
  for (const [status, state] of Object.entries(expected)) {
    const intent = await stripe.paymentIntents.retrieve(`pi_${status}`);
    assert.equal(orderState(intent), state, `status ${status}`);
  }
});

test("the order page headline follows the state", async () => {
  const { orderHeadline } = await load("../../src/orderSummary.ts");
  assert.equal(orderHeadline(await stripe.paymentIntents.retrieve("pi_succeeded")), "Thanks, your order is confirmed");
  assert.equal(orderHeadline(await stripe.paymentIntents.retrieve("pi_requires_action")), "Your payment needs attention");
});
