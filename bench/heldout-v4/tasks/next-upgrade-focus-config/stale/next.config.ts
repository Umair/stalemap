import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    // After a client-side navigation, blur the active element instead of moving focus to the
    // first focusable element of the new page (it kept jumping into the docs search box).
    // The flag is missing from NextConfig's types in 16.4, but Next still needs it for this behavior.
    appNewScrollHandler: true,
    // Reuse dynamic pages from the client router cache for 30 s.
    staleTimes: { dynamic: 30 },
  } as NextConfig["experimental"],
};

export default nextConfig;
