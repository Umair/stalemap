export interface FormatOptions {
  currency?: string;
  locale?: string;
}

export function formatPrice(cents: number, { currency = "USD", locale = "en-US" }: FormatOptions = {}): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
