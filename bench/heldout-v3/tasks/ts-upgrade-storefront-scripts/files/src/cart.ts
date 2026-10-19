namespace Shop {
  export interface LineItem {
    sku: string;
    name: string;
    unitCents: number;
    quantity: number;
  }

  export class Cart {
    private items: LineItem[] = [];

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

    get subtotalCents(): number {
      return this.items.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
    }

    get shippingCents(): number {
      const subtotal = this.subtotalCents;
      return subtotal === 0 || subtotal >= config.freeShippingFromCents ? 0 : config.shippingCents;
    }

    get totalCents(): number {
      return this.subtotalCents + this.shippingCents;
    }
  }
}
