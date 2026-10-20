import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    // Reuse dynamic pages from the client router cache for 30 s.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
