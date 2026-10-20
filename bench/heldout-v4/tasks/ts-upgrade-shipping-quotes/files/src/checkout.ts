import { Carrier, cheapest, describe, quotesFor } from "./legacy/shipping.js";

export interface ShippingChoice {
  label: string;
  cents: number;
  carrier: Carrier;
}

/** The cheapest way to ship a parcel, optionally within `maxDays` and with a preferred carrier. */
export function pickShipping(weightKg: number, maxDays?: number, preferred?: Carrier): ShippingChoice | undefined {
  const quote = cheapest(quotesFor(weightKg), (q) => (maxDays === undefined || q.days <= maxDays) && (preferred === undefined || q.carrier === preferred));
  if (!quote) return undefined;
  return { label: describe(quote, { currency: "USD" }), cents: quote.cents, carrier: quote.carrier };
}

export { Carrier };
