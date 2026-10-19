import type { Address, Customer } from "./schemas.ts";

const STORE = { line1: "12 Harbour Road", city: "Springfield", postalCode: "10001" };

/** Where to ship: the address entered at checkout, else the customer's default, else pickup at our store in `shopCountry`. */
export function shippingAddress(customer: Customer, entered: Address | undefined, shopCountry: string): Address {
  if (entered) return entered;
  if (customer.defaultAddress) return customer.defaultAddress;
  return { name: "Store pickup", ...STORE, country: shopCountry };
}
