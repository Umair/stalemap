import type { NextConfig } from "next";

export function withSecurityHeaders(config: NextConfig): NextConfig {
  const scriptSrc: string[] = config.securityHeaders?.scriptSrc ?? [];
  const csp = `default-src 'self'; script-src ${["'self'", ...scriptSrc].join(" ")}`;
  return {
    ...config,
    async headers() {
      const existing = (await config.headers?.()) ?? [];
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: csp },
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
            { key: "X-Content-Type-Options", value: "nosniff" },
          ],
        },
        ...existing,
      ];
    },
  };
}
