import type { NextConfig } from "next";
import { withSecurityHeaders } from "./src/with-security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  securityHeaders: { scriptSrc: ["https://plausible.io"] },
  async headers() {
    return [{ source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
};

export default withSecurityHeaders(nextConfig);
