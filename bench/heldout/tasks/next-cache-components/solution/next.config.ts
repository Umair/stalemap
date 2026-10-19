import type { NextConfig } from "next";

const config: NextConfig = {
  cacheComponents: true,
  images: { remotePatterns: [{ hostname: "images.example.com" }] },
};

export default config;
