import { SwissFranc, DollarSign, Euro, JapaneseYen, PoundSterling, type LucideIcon } from "lucide-react";

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CHF";

const icons: Record<Currency, LucideIcon> = {
  USD: DollarSign,
  EUR: Euro,
  GBP: PoundSterling,
  JPY: JapaneseYen,
  CHF: SwissFranc,
};

export function currencyIcon(currency: Currency): LucideIcon {
  return icons[currency];
}
