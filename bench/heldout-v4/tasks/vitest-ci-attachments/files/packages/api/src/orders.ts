export interface Order {
  id: string;
  items: { sku: string; qty: number; price: number }[];
}

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

export function orderResponse(order: Order) {
  return { id: order.id, total: orderTotal(order), lines: order.items.length };
}
