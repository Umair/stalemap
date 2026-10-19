export interface AppConfig {
  currency: string;
  taxRate: number;
}

export const config: AppConfig = {
  currency: process.env.INVOICE_CURRENCY ?? "USD",
  taxRate: Number(process.env.INVOICE_TAX_RATE ?? "0.2"),
};
