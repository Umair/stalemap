import { revalidateTag } from "next/cache";

/** Called by the CMS whenever a product is published or unpublished. */
export async function POST(request: Request) {
  if (request.headers.get("x-cms-secret") !== process.env.CMS_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidateTag("catalog", "max");
  return Response.json({ revalidated: true });
}
