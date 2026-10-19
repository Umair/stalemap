// Bundled as an IIFE whose exports become the global `Shop` that public/index.html uses.
export { config } from "./config";
export { formatPrice } from "./money";
export { Cart, type LineItem } from "./cart";
export { addToCart, cart, mount, removeFromCart } from "./mount";
