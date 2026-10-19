import { z } from "zod";
import { isCountryCode } from "./countries.ts";

export const Address = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().toUpperCase().refine(isCountryCode, { error: "We don't ship to this country" }),
});
export type Address = z.infer<typeof Address>;

export const Customer = z.object({
  id: z.string(),
  email: z.email(),
  defaultAddress: Address.optional(),
});
export type Customer = z.infer<typeof Customer>;
