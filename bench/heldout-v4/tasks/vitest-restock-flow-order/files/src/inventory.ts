const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

/** Stock levels per SKU. Every operation is async, like the warehouse API it stands in for. */
export class Inventory {
  private onHand = new Map<string, number>();
  private reserved = new Map<string, number>();

  async receive(sku: string, units: number): Promise<void> {
    await tick();
    this.onHand.set(sku, (this.onHand.get(sku) ?? 0) + units);
  }

  async reserve(sku: string, units: number): Promise<void> {
    await tick();
    if ((await this.available(sku)) < units) throw new Error(`Not enough ${sku} in stock`);
    this.reserved.set(sku, (this.reserved.get(sku) ?? 0) + units);
  }

  async available(sku: string): Promise<number> {
    await tick();
    return (this.onHand.get(sku) ?? 0) - (this.reserved.get(sku) ?? 0);
  }
}
