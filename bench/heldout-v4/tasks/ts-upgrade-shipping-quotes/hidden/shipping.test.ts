import assert from "node:assert/strict";
import { test } from "node:test";
// Imported the way src/checkout.ts imports them, so tsc checks the JavaScript's types here too.
import { Carrier, cheapest, describe, quotesFor } from "../../src/legacy/shipping.js";

type IsAny<T> = 0 extends 1 & T ? true : false;
// The legacy module keeps real types for the TypeScript code.
type Quote = ReturnType<typeof quotesFor>[number];
const quoteNotAny: IsAny<Quote> = false;
const centsNotAny: IsAny<Quote["cents"]> = false;
const daysIsNumber: number = ({} as Quote).days;
const acceptNotAny: IsAny<Parameters<typeof cheapest>[1]> = false;
const cheapestNotAny: IsAny<ReturnType<typeof cheapest>> = false;
const carrierType: Carrier = Carrier.UPS;
const quoteCarrier: Carrier = ({} as Quote).carrier;
void [quoteNotAny, centsNotAny, daysIsNumber, acceptNotAny, cheapestNotAny, carrierType, quoteCarrier];

const load = (id: string): Promise<any> => import(id);

test("the legacy shipping helpers behave as before", () => {
  assert.deepEqual({ ...Carrier }, { UPS: "ups", FEDEX: "fedex", POST: "post" });
  const quotes = quotesFor(2.3);
  assert.equal(quotes.length, 4);
  assert.deepEqual(cheapest(quotes), { carrier: "post", service: "Parcel", cents: 810, days: 5 });
  assert.equal(cheapest(quotes, (q) => q.days < 1), null);
  // The legacy signature takes `options` as a required (any-typed) argument, so pass it even when it is empty.
  assert.equal(describe(quotes[2], undefined), "UPS Next Day Air: $30.30 (1 day)");
  assert.equal(describe(quotes[0], { currency: "EUR" }), "POST Parcel: €8.10 (5 days)");
});

test("checkout picks the cheapest shipping that fits", async () => {
  const { pickShipping } = await load("../../src/checkout.ts");
  assert.deepEqual(pickShipping(2.3), { label: "POST Parcel: $8.10 (5 days)", cents: 810, carrier: "post" });
  assert.deepEqual(pickShipping(0.4, 3), { label: "UPS Ground: $7.85 (3 days)", cents: 785, carrier: "ups" });
  assert.deepEqual(pickShipping(10, 2), { label: "FEDEX 2Day: $27.50 (2 days)", cents: 2750, carrier: "fedex" });
  assert.deepEqual(pickShipping(1, undefined, "ups"), { label: "UPS Ground: $7.85 (3 days)", cents: 785, carrier: "ups" });
  assert.equal(pickShipping(1, 1, "post"), undefined);
});
