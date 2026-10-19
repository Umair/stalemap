import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts"], exclude: ["**/*.dom.test.ts", "**/node_modules/**"], environment: "node" } },
      { extends: true, test: { name: "dom", include: ["src/**/*.dom.test.ts"], environment: "jsdom" } },
    ],
  },
});
