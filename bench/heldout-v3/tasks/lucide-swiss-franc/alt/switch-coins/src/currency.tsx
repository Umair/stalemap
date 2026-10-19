import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CHF";

export function currencyIcon(currency: Currency): LucideIcon {
  switch (currency) {
    case "USD":
      return Icons.DollarSign;
    case "EUR":
      return Icons.Euro;
    case "GBP":
      return Icons.PoundSterling;
    case "JPY":
      return Icons.JapaneseYen;
    case "CHF":
      return Icons.Coins;
  }
}
