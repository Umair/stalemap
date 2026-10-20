import type Stripe from "stripe";
import { verifiedEvent, type StoredDelivery } from "./replay.ts";

/** Replays stored deliveries in order, handing each genuine event to `handle`. Returns the ids of rejected deliveries. */
export async function replayDeliveries(
  stripe: Stripe,
  deliveries: StoredDelivery[],
  endpointSecret: string,
  handle: (event: Stripe.Event) => Promise<void>,
): Promise<number[]> {
  const rejected: number[] = [];
  for (const delivery of deliveries) {
    let event: Stripe.Event;
    try {
      event = verifiedEvent(stripe, delivery, endpointSecret);
    } catch {
      rejected.push(delivery.id);
      continue;
    }
    await handle(event);
  }
  return rejected;
}
