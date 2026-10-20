import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    taskTitleValueFormatTruncate: 1000,
  },
});
