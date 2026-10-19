import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "http", hostname: "minio", port: "9000", pathname: "/catalog/**" }],
    // `minio` resolves to an address on the private compose network.
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
