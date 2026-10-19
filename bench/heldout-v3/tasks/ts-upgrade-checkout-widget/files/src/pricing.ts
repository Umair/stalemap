import type { Cart } from "./cart.js";
import { formatPrice } from "./format.js";

export type PriceLoader = (skus: string[]) => Promise<Record<string, number | undefined>>;

export const GIFT_WRAP_CENTS = 250;

/** Updates line prices from the merchant's price feed; returns how many lines changed (0 if the feed is down). */
export async function refreshPrices(cart: Cart, load: PriceLoader): Promise<number> {
  let prices: Record<string, number | undefined>;
  try {
    prices = await load(cart.lines().map((line) => line.sku));
  } catch {
    return 0;
  }
  let changed = 0;
  for (const line of cart.lines()) {
    const next = prices[line.sku] ?? line.unitCents;
    if (next !== line.unitCents) {
      line.unitCents = next;
      changed++;
    }
  }
  return changed;
}

export interface Summary {
  count: number;
  totalCents: number;
  total: string;
  firstItem?: string;
}

export function summarize(cart: Cart, locale?: string): Summary {
  const totalCents = cart
    .lines()
    .reduce((sum, { unitCents, quantity, giftWrap }) => sum + unitCents * quantity + (giftWrap ? GIFT_WRAP_CENTS : 0), 0);
  const { currency, ...counts } = { currency: cart.currency, count: cart.count };
  return { ...counts, totalCents, total: formatPrice(totalCents, { currency, locale }), firstItem: cart.lines()[0]?.name };
}
