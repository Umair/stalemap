export type Discount = { kind: "percent"; value: number } | { kind: "fixed"; value: number };

export function applyDiscount(total: number, discount: Discount): number {
  const reduced = discount.kind === "percent" ? total * (1 - discount.value / 100) : total - discount.value;
  return Math.max(0, Math.round(reduced * 100) / 100);
}
