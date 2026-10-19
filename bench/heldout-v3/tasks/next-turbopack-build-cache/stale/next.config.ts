import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  return {
    output: "standalone",
    poweredByHeader: false,
    experimental: {
      // Build servers don't keep .next/cache between builds.
      turbopackPersistentCaching: phase === PHASE_DEVELOPMENT_SERVER,
    },
  };
}
