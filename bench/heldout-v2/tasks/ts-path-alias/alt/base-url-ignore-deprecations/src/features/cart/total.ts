import { formatPrice } from "@/lib/format";

export function cartTotal(items: { priceCents: number; quantity: number }[]): string {
  return formatPrice(items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0));
}
