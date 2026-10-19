import type { NextConfig } from "next";

export default {
  images: {
    remotePatterns: [new URL("https://cdn.example.com/**")],
    qualities: [50, 75, 90, 100],
  },
} satisfies NextConfig;
