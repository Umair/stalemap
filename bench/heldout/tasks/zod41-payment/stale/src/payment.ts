import { z } from "zod";

export const PaymentSchema = z.object({
  cardNumber: z.creditCard(),
  currency: z.currencyCode(),
});
