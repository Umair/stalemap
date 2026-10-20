import Stripe from "stripe";

export interface CartItem {
  priceId: string;
  quantity: number;
}

const CARD_ONLY: Stripe.Checkout.SessionCreateParams["allowed_payment_method_types"] = ["card"];

/** Creates the hosted Checkout page for a cart and returns its URL. */
export async function createCheckout(stripe: Stripe, cart: CartItem[], customerEmail: string): Promise<string> {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    allowed_payment_method_types: CARD_ONLY,
    line_items: cart.map(({ priceId, quantity }) => ({ price: priceId, quantity })),
    customer_email: customerEmail,
    success_url: "https://shop.example.com/thanks?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://shop.example.com/cart",
  };
  const { url } = await stripe.checkout.sessions.create(params);
  if (!url) throw new Error("Checkout session has no URL");
  return url;
}
