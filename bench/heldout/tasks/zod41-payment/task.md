In `src/payment.ts`, export `PaymentSchema`, a zod schema for `{ cardNumber: string; currency: string }`:

- `cardNumber`: 13 to 19 digits that pass the Luhn checksum.
- `currency`: an ISO 4217 code, three uppercase letters.
