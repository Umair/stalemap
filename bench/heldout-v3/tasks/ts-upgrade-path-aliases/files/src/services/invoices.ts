import { config } from "@config";
import { sumCents } from "@lib/money";

export interface LineItem {
  description: string;
  cents: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function totals(items: LineItem[], taxRate = config.taxRate): InvoiceTotals {
  const subtotal = sumCents(items.map((item) => item.cents));
  const tax = Math.round(subtotal * taxRate);
  return { subtotal, tax, total: subtotal + tax };
}
