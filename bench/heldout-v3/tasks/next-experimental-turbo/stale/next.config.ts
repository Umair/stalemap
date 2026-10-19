import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      resolveAlias: {
        // chart-export's optional server-side PNG export; we don't use it.
        canvas: "./src/empty-module.ts",
      },
    },
  },
};

export default nextConfig;
