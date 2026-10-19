import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.example.com" }],
    // 75 is the default for every image; product photos use 90.
    qualities: [75, 90],
  },
};

export default nextConfig;
