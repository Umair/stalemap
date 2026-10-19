import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Set by CI to the git SHA of the build, so each blue/green deployment has its own id.
  deploymentId: process.env.DEPLOYMENT_ID,
};

export default config;
