export const COUNTRY_CODES = ["US", "CA", "GB", "DE", "FR", "NL"] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}
