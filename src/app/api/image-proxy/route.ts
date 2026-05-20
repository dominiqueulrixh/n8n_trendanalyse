import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new Response("Missing image url", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl, {
      redirect: "follow"
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("Failed to fetch image", { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") || "image/png";
  const buffer = await upstream.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    }
  });
}
