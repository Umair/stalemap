import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    clearMocks: true,
    experimental: {
      fsModuleCache: true,
      fsModuleCachePath: ".cache/vitest-modules",
    },
  },
});
