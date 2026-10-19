export interface LineItem {
  sku: string;
  name: string;
  unitCents: number;
  quantity: number;
  giftWrap?: boolean;
}

export class Cart {
  private items: LineItem[] = [];
  readonly currency: string;

  constructor(currency = "USD") {
    this.currency = currency;
  }

  add(item: LineItem): this {
    const existing = this.items.find((line) => line.sku === item.sku);
    if (existing) existing.quantity += item.quantity;
    else this.items.push({ ...item });
    return this;
  }

  remove(sku: string): this {
    this.items = this.items.filter((line) => line.sku !== sku);
    return this;
  }

  get count(): number {
    return this.items.reduce((n, line) => n + line.quantity, 0);
  }

  lines(): LineItem[] {
    return this.items;
  }
}
