import type { NextRequest } from "next/server";

// Share card for og:image, see app/blog/[slug]/page.tsx.
export async function GET(request: NextRequest): Promise<Response> {
  throw new Error("not implemented");
}
