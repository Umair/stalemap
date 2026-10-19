import type { NextConfig } from "next";

export default {
  poweredByHeader: false,
  images: {
    remotePatterns: [new URL("https://media.example.com/**")],
    maximumRedirects: 10,
    formats: ["image/avif", "image/webp"],
  },
} satisfies NextConfig;
