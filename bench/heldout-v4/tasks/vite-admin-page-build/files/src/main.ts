import { formatPrice, products } from "./products.ts";

const list = document.querySelector<HTMLUListElement>("#products");
for (const p of products) {
  const li = document.createElement("li");
  li.textContent = `${p.name}: ${formatPrice(p.priceCents)}`;
  list?.append(li);
}
