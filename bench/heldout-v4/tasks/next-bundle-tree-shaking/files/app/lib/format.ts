// A grab-bag of helpers; most pages use one or two of them.
export const formatPrice = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
export const formatDate = (d: Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
export const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`;
export const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
