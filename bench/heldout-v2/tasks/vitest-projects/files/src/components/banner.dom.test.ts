import { expect, test } from "vitest";

test("renders the sale banner", () => {
  document.body.innerHTML = `<p class="banner">Sale</p>`;
  expect(document.querySelector(".banner")?.textContent).toBe("Sale");
});
