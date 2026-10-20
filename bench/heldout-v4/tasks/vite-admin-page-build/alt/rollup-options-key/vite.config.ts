import path from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  root,
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        storefront: path.join(root, "index.html"),
        admin: path.join(root, "admin", "index.html"),
      },
    },
  },
});
