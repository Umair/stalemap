import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: { dynamicIO: true },
  images: { remotePatterns: [{ hostname: "images.example.com" }] },
};

export default config;
