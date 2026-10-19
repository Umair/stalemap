import { currencyIcon, type Currency } from "./currency.tsx";

export function PriceTag({ amount, currency }: { amount: number; currency: Currency }) {
  const Icon = currencyIcon(currency);
  return (
    <span className="price-tag" title={currency}>
      <Icon size={14} aria-hidden="true" />
      {amount.toFixed(2)}
    </span>
  );
}
