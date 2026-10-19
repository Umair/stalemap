import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = url.pathname.replace(/^\/old-blog\//, "/blog/");
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: "/old-blog/:path*" };
