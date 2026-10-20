import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    clearMocks: true,
    fsModuleCache: true,
    fsModuleCachePath: fileURLToPath(new URL("./.cache/vitest-modules", import.meta.url)),
  },
});
