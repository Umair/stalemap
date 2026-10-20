import Stripe from "stripe";

type CardError = InstanceType<typeof Stripe.errors.StripeCardError>;

/** What we tell the shopper for each card decline code. */
export const DECLINE_MESSAGES: Record<string, string> = {
  insufficient_funds: "Your card has insufficient funds. Please use another card.",
  expired_card: "Your card has expired. Please use another card.",
  incorrect_cvc: "The security code is incorrect. Please check it and try again.",
  lost_card: "Your card was declined. Please use another card.",
  stolen_card: "Your card was declined. Please use another card.",
};

/** For any other decline. */
export const GENERIC_DECLINE = "Your card was declined. Please try another card or contact your bank.";

/** The message for a card error thrown by the Stripe SDK. */
export function declineMessage(error: CardError): string {
  const code = error.decline_code;
  return code !== undefined && code in DECLINE_MESSAGES ? DECLINE_MESSAGES[code] : GENERIC_DECLINE;
}

export function isCardError(err: unknown): err is CardError {
  return err instanceof Stripe.errors.StripeError && err.type === "StripeCardError";
}
