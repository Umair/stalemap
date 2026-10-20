import type { NextConfig } from "next";

export default function config(): NextConfig {
  const experimental: NextConfig["experimental"] = { turbopackModuleFragments: true };
  return {
    reactStrictMode: true,
    poweredByHeader: false,
    images: { formats: ["image/avif", "image/webp"] },
    experimental,
  };
}
