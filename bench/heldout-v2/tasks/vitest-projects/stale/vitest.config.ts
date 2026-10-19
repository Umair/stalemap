import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environmentMatchGlobs: [["src/**/*.dom.test.ts", "jsdom"]],
  },
});
