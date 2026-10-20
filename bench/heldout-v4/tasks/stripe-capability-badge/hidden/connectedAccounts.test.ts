import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import Stripe from "stripe";
const load = (id: string): Promise<any> => import(id);

// A local stand-in for the Stripe v2 accounts API. The account id names the card_payments status ("none": no capability,
// "nomerchant": no merchant configuration).
const server = http.createServer((req, res) => {
  const id = decodeURIComponent((req.url ?? "").split("?")[0].split("/").pop()!);
  const status = id.replace(/^acct_/, "");
  const merchant =
    status === "nomerchant"
      ? undefined
      : {
          applied: true,
          capabilities:
            status === "none"
              ? {}
              : { card_payments: { status, status_details: status === "active" ? [] : [{ code: "determining_status", resolution: "provide_info" }] } },
        };
  res.writeHead(200, { "Content-Type": "application/json", "Request-Id": "req_test" });
  res.end(
    JSON.stringify({
      id,
      object: "v2.core.account",
      applied_configurations: merchant ? ["merchant"] : ["customer"],
      configuration: merchant ? { merchant } : {},
      created: "2026-10-01T12:00:00.000Z",
      display_name: `Shop ${status}`,
      livemode: false,
    }),
  );
});
let stripe: Stripe;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  stripe = new Stripe("sk_test_123", { host: "127.0.0.1", port: (server.address() as AddressInfo).port, protocol: "http", maxNetworkRetries: 0 });
});
after(() => server.close());

const account = (status: string) => stripe.v2.core.accounts.retrieve(`acct_${status}`, { include: ["configuration.merchant"] });

test("badges follow the card_payments capability status", async () => {
  const { cardPaymentsBadge } = await load("../../src/connectedAccounts.ts");
  assert.equal(cardPaymentsBadge(await account("active")), "Live");
  assert.equal(cardPaymentsBadge(await account("pending")), "In review");
  assert.equal(cardPaymentsBadge(await account("restricted")), "Action needed");
  assert.equal(cardPaymentsBadge(await account("unsupported")), "Not available");
});

test("accounts without the capability or the merchant configuration are not available", async () => {
  const { cardPaymentsBadge } = await load("../../src/connectedAccounts.ts");
  assert.equal(cardPaymentsBadge(await account("none")), "Not available");
  assert.equal(cardPaymentsBadge(await account("nomerchant")), "Not available");
});

test("table rows carry the badge", async () => {
  const { accountRow } = await load("../../src/accountsTable.ts");
  assert.deepEqual(accountRow(await account("pending")), { id: "acct_pending", name: "Shop pending", cardPayments: "In review" });
});
