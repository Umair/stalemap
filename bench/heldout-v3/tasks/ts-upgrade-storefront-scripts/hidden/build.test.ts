import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import vm from "node:vm";

const root = fileURLToPath(new URL("../../", import.meta.url));
const appJs = join(root, "public", "js", "app.js");

/** Loads the page's scripts the way public/index.html does, with just enough of a DOM for them. */
async function loadPage(): Promise<{ Shop: any; cartEl: { textContent: string } }> {
  const cartEl = { id: "cart", textContent: "" };
  const document = { getElementById: (id: string) => (id === "cart" ? cartEl : null) };
  const sandbox: Record<string, unknown> = { document, console };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(await readFile(appJs, "utf8"), context, { filename: "js/app.js" });
  const html = await readFile(join(root, "public", "index.html"), "utf8");
  for (const [, inline] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(inline, context, { filename: "index.html" });
  return { Shop: vm.runInContext("Shop", context), cartEl };
}

test("npm run build produces the single page script with the same Shop API", async () => {
  await rm(appJs, { force: true });
  let output = "";
  try {
    await promisify(execFile)("npm", ["run", "build", "--silent"], { cwd: root, timeout: 50_000, shell: process.platform === "win32" });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    output = `${e.stdout ?? ""}${e.stderr ?? ""}` || String(err);
  }
  assert.equal(output, "", "npm run build fails");

  const { Shop, cartEl } = await loadPage();
  assert.equal(cartEl.textContent, "Your cart is empty", "index.html mounts the cart");
  assert.equal(Shop.formatPrice(123456), "$1,234.56");
  assert.equal(Shop.config.currency, "USD");

  Shop.addToCart({ sku: "MUG", name: "Mug", unitCents: 1200, quantity: 1 });
  assert.equal(cartEl.textContent, "1 item · $16.99");
  Shop.addToCart({ sku: "MUG", name: "Mug", unitCents: 1200, quantity: 2 });
  Shop.addToCart({ sku: "TEE", name: "T-shirt", unitCents: 2000, quantity: 1 });
  assert.equal(cartEl.textContent, "4 items · $56.00");
  assert.equal(Shop.cart.shippingCents, 0);
  Shop.removeFromCart("MUG");
  assert.equal(cartEl.textContent, "1 item · $24.99");

  const cart = new Shop.Cart().add({ sku: "A", name: "A", unitCents: 999, quantity: 3 });
  assert.deepEqual([cart.count, cart.subtotalCents, cart.shippingCents, cart.totalCents], [3, 2997, 499, 3496]);
});
