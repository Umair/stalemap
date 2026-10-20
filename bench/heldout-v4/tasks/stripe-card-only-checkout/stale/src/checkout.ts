import Stripe from "stripe";

export interface CartItem {
  priceId: string;
  quantity: number;
}

/** Creates the hosted Checkout page for a cart and returns its URL. */
export async function createCheckout(stripe: Stripe, cart: CartItem[], customerEmail: string): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: cart.map((item) => ({ price: item.priceId, quantity: item.quantity })),
    customer_email: customerEmail,
    success_url: "https://shop.example.com/thanks?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://shop.example.com/cart",
  });
  if (!session.url) throw new Error("Checkout session has no URL");
  return session.url;
}
