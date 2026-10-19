import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.example.com", pathname: "/p/**" }],
    // Media server URLs redirect up to 5 times before the file.
    maximumRedirects: 5,
  },
};

export default nextConfig;
