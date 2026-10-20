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
