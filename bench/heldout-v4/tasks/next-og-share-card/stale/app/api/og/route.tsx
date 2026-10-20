import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// Share card for og:image, see app/blog/[slug]/page.tsx.
export async function GET(request: NextRequest): Promise<Response> {
  const title = request.nextUrl.searchParams.get("title") || "Acme Blog";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          background: "#111827",
          color: "#f9fafb",
          fontSize: 72,
          fontWeight: 700,
        }}
      >
        {title}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
