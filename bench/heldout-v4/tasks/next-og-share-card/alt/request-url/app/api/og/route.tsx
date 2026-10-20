import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

function Card({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%", height: "100%", padding: 64, backgroundColor: "black" }}>
      <div style={{ display: "flex", fontSize: 80, color: "white", lineHeight: 1.1 }}>{title}</div>
      <div style={{ display: "flex", fontSize: 32, color: "#9ca3af", marginTop: 24 }}>acme.blog</div>
    </div>
  );
}

export async function GET(request: Request): Promise<Response> {
  const title = new URL(request.url).searchParams.get("title")?.trim() || "Acme Blog";
  return new ImageResponse(<Card title={title} />, size);
}
