import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.example.com" }],
  },
};

export default config;
