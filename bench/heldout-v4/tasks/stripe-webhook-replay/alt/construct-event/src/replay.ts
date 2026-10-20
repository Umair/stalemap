import type Stripe from "stripe";

/** A webhook delivery as we stored it when it arrived: the raw request body and its Stripe-Signature header. */
export interface StoredDelivery {
  id: number;
  payload: string;
  signature: string;
  receivedAt: Date;
}

/** The Stripe event in a stored delivery, after checking that Stripe signed it with our endpoint secret. */
export function verifiedEvent(stripe: Stripe, delivery: StoredDelivery, endpointSecret: string): Stripe.Event {
  const noTimestampCheck = 0;
  return stripe.webhooks.constructEvent(delivery.payload, delivery.signature, endpointSecret, noTimestampCheck);
}
