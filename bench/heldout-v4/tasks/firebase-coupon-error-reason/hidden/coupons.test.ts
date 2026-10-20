import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);

/** Local stand-in for the deployed `redeemCoupon` callable function (callable protocol). */
let calls = 0;
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method !== "POST" || !req.url?.endsWith("/redeemCoupon")) return reply(404, { error: { status: "NOT_FOUND", message: "Not found" } });
    calls++;
    const code = JSON.parse(raw)?.data?.code;
    if (code === "SPRING25") return reply(200, { result: { discountPercent: 25 } });
    if (code === "WINTER10") return reply(400, { error: { status: "FAILED_PRECONDITION", message: "This coupon has expired" } });
    if (code === "NOPE") return reply(404, { error: { status: "NOT_FOUND", message: "We don't recognize that coupon code" } });
    return reply(500, { error: { status: "INTERNAL", message: "INTERNAL" } });
  });
});

const realFetch = globalThis.fetch;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const local = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  globalThis.fetch = ((input: any, init?: any) => {
    const url = String(input instanceof Request ? input.url : input);
    return realFetch(url.replace(/^https:\/\/[a-z0-9-]+\.cloudfunctions\.net/, local), init);
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
  server.close();
});

test("a valid coupon applies its discount", async () => {
  const { redeemCoupon } = await load("../../src/coupons.ts");
  assert.deepEqual(await redeemCoupon("SPRING25"), { ok: true, discountPercent: 25 });
});

test("a turned-down coupon returns the server's reason as is", async () => {
  const { redeemCoupon } = await load("../../src/coupons.ts");
  assert.deepEqual(await redeemCoupon("WINTER10"), { ok: false, reason: "This coupon has expired" });
  assert.deepEqual(await redeemCoupon("NOPE"), { ok: false, reason: "We don't recognize that coupon code" });
});

test("other failures still throw", async () => {
  const { redeemCoupon } = await load("../../src/coupons.ts");
  await assert.rejects(redeemCoupon("CRASH"));
  assert.ok(calls >= 4, "the callable function was used");
});
