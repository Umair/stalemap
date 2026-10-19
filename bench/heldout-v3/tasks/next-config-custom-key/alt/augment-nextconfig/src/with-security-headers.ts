import type { NextConfig } from "next";

declare module "next/dist/server/config-shared" {
  interface NextConfig {
    /** Options for withSecurityHeaders(). */
    securityHeaders?: { scriptSrc?: readonly string[] };
  }
}

const SECURITY_HEADERS = (scriptSrc: readonly string[]) => [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' ${scriptSrc.join(" ")};` },
];

export function withSecurityHeaders(nextConfig: NextConfig): NextConfig {
  const { securityHeaders, headers: appHeaders, ...rest } = nextConfig;
  return {
    ...rest,
    headers: async () => [
      ...((await appHeaders?.()) ?? []),
      { source: "/(.*)", headers: SECURITY_HEADERS(securityHeaders?.scriptSrc ?? []) },
    ],
  };
}
