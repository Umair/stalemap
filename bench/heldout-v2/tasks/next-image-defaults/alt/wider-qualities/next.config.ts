import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [new URL("https://cdn.example.com/**")],
    qualities: [50, 75, 90, 100],
    minimumCacheTTL: 60,
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default config;
