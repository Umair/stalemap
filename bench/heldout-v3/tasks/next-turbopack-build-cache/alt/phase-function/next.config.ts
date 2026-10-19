import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

export default (phase: string): NextConfig => ({
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: phase !== PHASE_PRODUCTION_BUILD && !process.env.CI,
  },
});
