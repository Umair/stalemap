// Shipping rates, carried over from the old storefront (Closure-annotated JavaScript).

export const Carrier = /** @type {const} */ ({
  UPS: "ups",
  FEDEX: "fedex",
  POST: "post",
});

/** @typedef {(typeof Carrier)[keyof typeof Carrier]} Carrier */

/**
 * @typedef {object} Quote
 * @property {Carrier} carrier
 * @property {string} service
 * @property {number} cents
 * @property {number} days
 */

/** @type {Array<{ carrier: Carrier, service: string, base: number, perKg: number, days: number }>} */
var RATES = [
  { carrier: Carrier.POST, service: "Parcel", base: 450, perKg: 120, days: 5 },
  { carrier: Carrier.UPS, service: "Ground", base: 690, perKg: 95, days: 3 },
  { carrier: Carrier.UPS, service: "Next Day Air", base: 2400, perKg: 210, days: 1 },
  { carrier: Carrier.FEDEX, service: "2Day", base: 1350, perKg: 140, days: 2 },
];

/**
 * Every quote for a parcel of the given weight.
 * @param {number} weightKg
 * @return {Array<Quote>}
 */
export function quotesFor(weightKg) {
  var kg = Math.max(1, Math.ceil(weightKg));
  return RATES.map(function (r) {
    return { carrier: r.carrier, service: r.service, cents: r.base + r.perKg * kg, days: r.days };
  });
}

/**
 * The cheapest quote that passes `accept`, or null when none does.
 * @param {Array<Quote>} quotes
 * @param {((quote: Quote) => boolean) | undefined} [accept]
 * @return {?Quote}
 */
export function cheapest(quotes, accept) {
  var best = null;
  for (var i = 0; i < quotes.length; i++) {
    var q = quotes[i];
    if (accept && !accept(q)) continue;
    if (!best || q.cents < best.cents) best = q;
  }
  return best;
}

/**
 * "UPS Ground: $7.85 (3 days)".
 * @param {Quote} quote
 * @param {{ currency?: string } | undefined} [options] Anything with a `currency` field; defaults to USD.
 * @return {string}
 */
export function describe(quote, options) {
  var currency = (options && options.currency) || "USD";
  var price = new Intl.NumberFormat("en-US", { style: "currency", currency: currency }).format(quote.cents / 100);
  var days = quote.days === 1 ? "1 day" : quote.days + " days";
  return quote.carrier.toUpperCase() + " " + quote.service + ": " + price + " (" + days + ")";
}
