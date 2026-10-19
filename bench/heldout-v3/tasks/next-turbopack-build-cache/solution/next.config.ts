import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // Build servers don't keep .next/cache between builds.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
