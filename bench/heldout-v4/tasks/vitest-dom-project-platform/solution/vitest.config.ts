import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

/** Points `#platform` at the browser implementation in DOM test environments and at the Node one everywhere else. */
function platformAlias(): Plugin {
  return {
    name: "platform-alias",
    config(config) {
      const env = config.test?.environment ?? "node";
      const browser = env === "jsdom" || env === "happy-dom";
      const file = browser ? "./src/platform/browser.ts" : "./src/platform/node.ts";
      return { resolve: { alias: { "#platform": fileURLToPath(new URL(file, import.meta.url)) } } };
    },
  };
}

export default defineConfig({
  plugins: [platformAlias()],
  test: {
    sharedViteServer: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.dom.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.dom.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
