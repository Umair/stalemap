import type { NextConfig } from "next";

export default function config(phase: string): NextConfig {
  return {
    images: {
      remotePatterns: [new URL("https://images.example.com/**")],
    },
    cacheComponents: true,
    partialPrefetching: false,
  } satisfies NextConfig;
}
