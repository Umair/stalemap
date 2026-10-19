import type { NextConfig } from "next";

const emptyModule = "./src/stubs/canvas.ts";

export default function config(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    turbopack: {
      resolveAlias: {
        canvas: { browser: emptyModule, default: emptyModule },
      },
    },
  };
}
