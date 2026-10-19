"use server";

export async function placeOrder(items: string[]): Promise<{ orderId: string }> {
  if (items.length === 0) throw new Error("Your cart is empty");
  return { orderId: `ord_${Date.now().toString(36)}` };
}
