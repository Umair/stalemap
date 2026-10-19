import { formatPrice } from "./format.js";

export interface CartLine {
  name: string;
  cents: number;
  qty: number;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, { cents, qty }) => sum + cents * qty, 0);
}

export function summary(lines: CartLine[]): string {
  const count = lines.reduce((n, line) => n + line.qty, 0);
  return `${count} item${count === 1 ? "" : "s"}, ${formatPrice(cartTotal(lines))}`;
}
