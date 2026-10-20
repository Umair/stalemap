import type { NextConfig } from "next";

// Blurring the active element after client-side navigations is how Next's App Router behaves now.
export default function config(): NextConfig {
  return {
    reactStrictMode: true,
    typedRoutes: true,
    experimental: { staleTimes: { dynamic: 30 } },
  };
}
