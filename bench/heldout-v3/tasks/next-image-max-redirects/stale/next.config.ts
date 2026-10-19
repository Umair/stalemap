import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.example.com", pathname: "/p/**" }],
  },
};

export default nextConfig;
