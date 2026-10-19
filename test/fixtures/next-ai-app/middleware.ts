import { NextResponse, type NextRequest, type NextMiddleware } from "next/server";
export const middleware: NextMiddleware = (req: NextRequest) => NextResponse.next();
export const config = { matcher: ["/dashboard/:path*"] };
