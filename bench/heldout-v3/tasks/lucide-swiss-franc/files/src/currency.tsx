import { DollarSign, Euro, JapaneseYen, PoundSterling, type LucideIcon } from "lucide-react";

export type Currency = "USD" | "EUR" | "GBP" | "JPY";

const icons: Record<Currency, LucideIcon> = {
  USD: DollarSign,
  EUR: Euro,
  GBP: PoundSterling,
  JPY: JapaneseYen,
};

export function currencyIcon(currency: Currency): LucideIcon {
  return icons[currency];
}
