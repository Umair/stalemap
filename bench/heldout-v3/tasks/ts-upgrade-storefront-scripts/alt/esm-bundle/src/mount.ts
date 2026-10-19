import { Cart, type LineItem } from "./cart";
import { formatPrice } from "./money";

export const cart = new Cart();
let target: HTMLElement | null = null;

function render(): void {
  if (!target) return;
  const count = cart.count;
  target.textContent =
    count === 0 ? "Your cart is empty" : `${count} ${count === 1 ? "item" : "items"} · ${formatPrice(cart.totalCents)}`;
}

export function mount(el: HTMLElement | null): void {
  target = el;
  render();
}

export function addToCart(item: LineItem): void {
  cart.add(item);
  render();
}

export function removeFromCart(sku: string): void {
  cart.remove(sku);
  render();
}
