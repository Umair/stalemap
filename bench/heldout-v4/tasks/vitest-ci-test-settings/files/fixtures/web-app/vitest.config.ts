import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    testTimeout: 10_000,
    include: ["tests/**/*.spec.ts"],
  },
});
