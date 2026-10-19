import type { NextConfig } from "next";

export default {
  output: "standalone",
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [new URL("http://minio:9000/catalog/**")],
    formats: ["image/avif", "image/webp"],
  },
} satisfies NextConfig;
