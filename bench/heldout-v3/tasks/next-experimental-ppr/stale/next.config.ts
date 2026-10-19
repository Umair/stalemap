import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: "incremental",
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.example.com" }],
  },
};

export default nextConfig;
