import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import Stripe from "stripe";
const load = (id: string): Promise<any> => import(id);

// A local stand-in for the Stripe API's Checkout Sessions endpoint. It resolves the payment methods a session offers
// the way the API version in the request's Stripe-Version header does, and rejects parameters that version doesn't know.
const ELIGIBLE = ["card", "link", "klarna", "paypal"];
const created: Array<{ params: URLSearchParams; offered: string[] }> = [];
const list = (p: URLSearchParams, name: string) => (p.has(`${name}[0]`) ? [...p.keys()].filter((k) => k.startsWith(`${name}[`)).map((k) => p.get(k)!) : null);
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json", "Request-Id": "req_test" });
      res.end(JSON.stringify(body));
    };
    if (req.method !== "POST" || req.url !== "/v1/checkout/sessions") return send(404, { error: { type: "invalid_request_error", message: `Unrecognized request URL (${req.method}: ${req.url})` } });
    const params = new URLSearchParams(raw);
    const version = String(req.headers["stripe-version"] ?? "");
    // payment_method_types was replaced by allowed_payment_method_types in 2026-09-30.
    const unknown = version >= "2026-09-30" ? "payment_method_types" : "allowed_payment_method_types";
    if (list(params, unknown) || params.has(unknown)) {
      return send(400, { error: { type: "invalid_request_error", code: "parameter_unknown", param: unknown, message: `Received unknown parameter: ${unknown}` } });
    }
    let offered = list(params, "payment_method_types") ?? [...ELIGIBLE];
    const allowed = list(params, "allowed_payment_method_types");
    if (allowed) offered = offered.filter((m) => allowed.includes(m));
    const excluded = list(params, "excluded_payment_method_types");
    if (excluded) offered = offered.filter((m) => !excluded.includes(m));
    created.push({ params, offered });
    const id = `cs_test_${created.length}`;
    send(200, { id, object: "checkout.session", mode: params.get("mode"), payment_method_types: offered, url: `https://checkout.stripe.com/c/pay/${id}` });
  });
});
let stripe: Stripe;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  stripe = new Stripe("sk_test_123", { host: "127.0.0.1", port: (server.address() as AddressInfo).port, protocol: "http", maxNetworkRetries: 0 });
});
after(() => server.close());

test("the Checkout page offers only cards, and the session is otherwise unchanged", async () => {
  const { createCheckout } = await load("../../src/checkout.ts");
  created.length = 0;
  const url = await createCheckout(stripe, [{ priceId: "price_tee", quantity: 2 }, { priceId: "price_mug", quantity: 1 }], "ada@example.com");
  assert.equal(created.length, 1, "one Checkout Session is created");
  assert.equal(url, "https://checkout.stripe.com/c/pay/cs_test_1");
  const { params, offered } = created[0];
  assert.deepEqual(offered, ["card"], "customers can only pay by card");
  assert.equal(params.get("mode"), "payment");
  assert.equal(params.get("customer_email"), "ada@example.com");
  assert.equal(params.get("line_items[0][price]"), "price_tee");
  assert.equal(params.get("line_items[0][quantity]"), "2");
  assert.equal(params.get("line_items[1][price]"), "price_mug");
  assert.equal(params.get("success_url"), "https://shop.example.com/thanks?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(params.get("cancel_url"), "https://shop.example.com/cart");
});
