import { summary, type CartLine } from "./cart.js";

const lines: CartLine[] = [];

document.querySelectorAll<HTMLButtonElement>("button[data-name]").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.name ?? "";
    const existing = lines.find((line) => line.name === name);
    if (existing) existing.qty += 1;
    else lines.push({ name, cents: Number(button.dataset.cents), qty: 1 });
    const output = document.querySelector("#summary");
    if (output) output.textContent = summary(lines);
  });
});
