import { config } from "@config";
import { formatCents } from "@lib/money";
import { totals, type LineItem } from "services/invoices";

export function renderInvoice(items: LineItem[]): string {
  const { subtotal, tax, total } = totals(items);
  const lines = items.map((item) => `${item.description}: ${formatCents(item.cents, config.currency)}`);
  lines.push(`Subtotal: ${formatCents(subtotal, config.currency)}`);
  lines.push(`Tax: ${formatCents(tax, config.currency)}`);
  lines.push(`Total: ${formatCents(total, config.currency)}`);
  return lines.join("\n");
}
