import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

/** Points `#platform` at the browser or Node implementation. */
function platformAlias(browser: boolean): Plugin {
  return {
    name: "platform-alias",
    config() {
      const file = browser ? "./src/platform/browser.ts" : "./src/platform/node.ts";
      return { resolve: { alias: { "#platform": fileURLToPath(new URL(file, import.meta.url)) } } };
    },
  };
}

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [platformAlias(false)],
        test: { name: "unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.dom.test.ts"], environment: "node" },
      },
      {
        plugins: [platformAlias(true)],
        test: { name: "dom", include: ["src/**/*.dom.test.ts"], environment: "jsdom" },
      },
    ],
  },
});
