import type { NextConfig } from "next";

const config: NextConfig = {
  images: { remotePatterns: [{ hostname: "images.example.com" }] },
};

export default config;
