import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.example.com" }],
    minimumCacheTTL: 60,
  },
};

export default config;
