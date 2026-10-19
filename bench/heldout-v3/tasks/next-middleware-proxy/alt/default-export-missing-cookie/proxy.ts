import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only runs for dashboard requests that carry no session cookie.
export const config = {
  matcher: [{ source: "/dashboard/:path*", missing: [{ type: "cookie", key: "session" }] }],
};

export default async function guard(request: NextRequest) {
  const url = request.nextUrl.clone();
  const from = url.pathname;
  url.pathname = "/login";
  url.search = `?from=${encodeURIComponent(from)}`;
  return NextResponse.redirect(url, 307);
}
