import { config } from "./config";

const formatter = new Intl.NumberFormat(config.locale, { style: "currency", currency: config.currency });

export function formatPrice(cents: number): string {
  return formatter.format(cents / 100);
}
