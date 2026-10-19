export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
