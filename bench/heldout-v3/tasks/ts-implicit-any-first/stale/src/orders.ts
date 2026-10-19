export interface Order {
  id: string;
  customer: string;
  items: { sku: string; qty: number }[];
  coupon?: string;
}

const prices = new Map<string, number>([
  ["tea", 4],
  ["cake", 6.5],
  ["coffee", 3],
]);

const coupons: Record<string, number> = { SPRING10: 0.1, VIP20: 0.2 };

export function lineTotal(sku: string, qty: number) {
  const price: number = prices.get(sku);
  return price * qty;
}

export function orderTotal(order: Order): number {
  let total = 0;
  for (const item of order.items) total += lineTotal(item.sku, item.qty);
  const discount: number = order.coupon ? coupons[order.coupon] : 0;
  return Math.round(total * (1 - discount) * 100) / 100;
}

export function findOrder(orders: Order[], id: string) {
  const order: Order = orders.find((o) => o.id === id);
  return order;
}

export function describeOrder(order: Order) {
  let label: string = null;
  if (order.items.length > 0) label = `${order.customer}: ${order.items.length} item(s)`;
  return label;
}
