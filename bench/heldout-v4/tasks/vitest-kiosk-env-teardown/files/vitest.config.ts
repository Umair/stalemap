import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "./src/testing/kiosk-environment.ts",
    include: ["src/**/*.spec.ts"],
  },
});
