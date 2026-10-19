import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "http", hostname: "minio", port: "9000", pathname: "/catalog/**" }],
  },
};

export default nextConfig;
