import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import Stripe from "stripe";
const load = (id: string): Promise<any> => import(id);

// A local stand-in for the Stripe API. The payment method id decides the outcome:
// pm_ok succeeds, pm_decline_<code> is declined with that decline code, pm_invalid is an invalid request.
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const params = new URLSearchParams(raw);
    const pm = params.get("payment_method") ?? "";
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json", "Request-Id": "req_test" });
      res.end(JSON.stringify(body));
    };
    if (pm === "pm_ok") return send(200, { id: "pi_ok", object: "payment_intent", status: "succeeded", amount: Number(params.get("amount")), currency: params.get("currency") });
    if (pm.startsWith("pm_decline_")) {
      const decline_code = pm.slice("pm_decline_".length);
      return send(402, { error: { type: "card_error", code: "card_declined", decline_code, message: "Your card was declined.", payment_intent: { id: "pi_declined", object: "payment_intent", status: "requires_payment_method" } } });
    }
    return send(400, { error: { type: "invalid_request_error", code: "resource_missing", param: "payment_method", message: `No such PaymentMethod: '${pm}'` } });
  });
});
let stripe: Stripe;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  stripe = new Stripe("sk_test_123", { host: "127.0.0.1", port: (server.address() as AddressInfo).port, protocol: "http", maxNetworkRetries: 0 });
});
after(() => server.close());

const order = (paymentMethodId: string) => ({ id: "ord_1", amountCents: 2599, currency: "eur", customerId: "cus_1", paymentMethodId });

test("a successful charge returns the payment intent", async () => {
  const { chargeOrder } = await load("../../src/checkout.ts");
  assert.deepEqual(await chargeOrder(stripe, order("pm_ok")), { ok: true, paymentIntentId: "pi_ok" });
});

test("a declined card returns the shopper message for its decline code", async () => {
  const { chargeOrder } = await load("../../src/checkout.ts");
  const { DECLINE_MESSAGES } = await load("../../src/declines.ts");
  assert.deepEqual(await chargeOrder(stripe, order("pm_decline_insufficient_funds")), { ok: false, message: DECLINE_MESSAGES.insufficient_funds });
  assert.deepEqual(await chargeOrder(stripe, order("pm_decline_incorrect_cvc")), { ok: false, message: DECLINE_MESSAGES.incorrect_cvc });
});

test("other decline codes get the generic message", async () => {
  const { chargeOrder } = await load("../../src/checkout.ts");
  const { GENERIC_DECLINE } = await load("../../src/declines.ts");
  assert.deepEqual(await chargeOrder(stripe, order("pm_decline_do_not_honor")), { ok: false, message: GENERIC_DECLINE });
});

test("other errors still throw", async () => {
  const { chargeOrder } = await load("../../src/checkout.ts");
  await assert.rejects(chargeOrder(stripe, order("pm_missing")), (err: unknown) => err instanceof Stripe.errors.StripeInvalidRequestError);
});

test("declineMessage() takes the SDK's card error", async () => {
  const { declineMessage, DECLINE_MESSAGES } = await load("../../src/declines.ts");
  const err = new Stripe.errors.StripeCardError({ type: "card_error", code: "card_declined", decline_code: "expired_card", message: "Your card has expired." });
  assert.ok(err instanceof Stripe.errors.StripeCardError);
  assert.equal(declineMessage(err), DECLINE_MESSAGES.expired_card);
});
