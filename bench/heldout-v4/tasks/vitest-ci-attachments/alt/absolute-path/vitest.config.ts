import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const artifactsDir = fileURLToPath(new URL("./test-artifacts", import.meta.url));

export default defineConfig({
  test: {
    attachmentsDir: artifactsDir,
    projects: ["packages/*"],
  },
});
