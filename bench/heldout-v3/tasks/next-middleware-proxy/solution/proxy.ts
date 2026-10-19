import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./src/lib/session";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
