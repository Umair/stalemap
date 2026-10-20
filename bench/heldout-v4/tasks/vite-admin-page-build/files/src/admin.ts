import { formatPrice, products } from "./products.ts";

const table = document.querySelector<HTMLTableElement>("#orders");
table?.setAttribute("data-view", "admin-stock-table");
for (const p of products) {
  const row = table?.insertRow();
  row?.insertCell().append(p.sku);
  row?.insertCell().append(formatPrice(p.priceCents));
}
