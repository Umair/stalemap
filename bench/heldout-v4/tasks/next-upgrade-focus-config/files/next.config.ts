import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    // After a client-side navigation, blur the active element instead of moving focus to the
    // first focusable element of the new page (it kept jumping into the docs search box).
    appNewScrollHandler: true,
    // Reuse dynamic pages from the client router cache for 30 s.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
