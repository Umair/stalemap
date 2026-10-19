import type { NextConfig } from "next";

export interface SecurityHeadersOptions {
  /** Extra sources scripts may load from, besides the site itself. */
  scriptSrc?: string[];
}

/** A Next.js config that may also carry this plugin's options. */
export type NextConfigWithSecurityHeaders = NextConfig & { securityHeaders?: SecurityHeadersOptions };

export function withSecurityHeaders({ securityHeaders = {}, ...config }: NextConfigWithSecurityHeaders): NextConfig {
  const csp = [`default-src 'self'`, `script-src ${["'self'", ...(securityHeaders.scriptSrc ?? [])].join(" ")}`].join("; ");
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
