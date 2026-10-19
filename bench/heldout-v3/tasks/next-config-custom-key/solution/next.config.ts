import { withSecurityHeaders, type NextConfigWithSecurityHeaders } from "./src/with-security-headers";

const nextConfig: NextConfigWithSecurityHeaders = {
  poweredByHeader: false,
  securityHeaders: { scriptSrc: ["https://plausible.io"] },
  async headers() {
    return [{ source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
};

export default withSecurityHeaders(nextConfig);
