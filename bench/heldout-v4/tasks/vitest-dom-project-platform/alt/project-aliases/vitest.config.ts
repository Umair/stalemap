import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const platformFile = (name: "browser" | "node") => fileURLToPath(new URL(`./src/platform/${name}.ts`, import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { "#platform": platformFile("node") } },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.dom.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias: { "#platform": platformFile("browser") } },
        test: {
          name: "dom",
          include: ["src/**/*.dom.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
