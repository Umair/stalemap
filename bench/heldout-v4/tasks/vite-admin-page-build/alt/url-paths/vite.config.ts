import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    sourcemap: true,
    rolldownOptions: {
      input: [page("./index.html"), page("./admin/index.html")],
    },
  },
});
