import Stripe from "stripe";

export interface Order {
  id: string;
  amountCents: number;
  currency: string;
  customerId: string;
  paymentMethodId: string;
}

export type ChargeResult = { ok: true; paymentIntentId: string } | { ok: false; message: string };

/** Charges the order's saved card. */
export async function chargeOrder(stripe: Stripe, order: Order): Promise<ChargeResult> {
  const intent = await stripe.paymentIntents.create({
    amount: order.amountCents,
    currency: order.currency,
    customer: order.customerId,
    payment_method: order.paymentMethodId,
    confirm: true,
    off_session: true,
    metadata: { order_id: order.id },
  });
  return { ok: true, paymentIntentId: intent.id };
}
