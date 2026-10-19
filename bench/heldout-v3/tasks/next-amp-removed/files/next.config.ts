import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.example.com" }],
  },
};

export default config;
