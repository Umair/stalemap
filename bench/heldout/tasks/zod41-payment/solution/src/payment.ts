import { z } from "zod";

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const PaymentSchema = z.object({
  cardNumber: z.string().regex(/^\d{13,19}$/).refine(luhn, "Invalid card number"),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
