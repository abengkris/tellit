import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return Response.json({ error: "Missing URL" }, { status: 400 });

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TellItBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });

    const html = await response.text();
    
    // Simple regex extraction for OG tags
    const getMeta = (property: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${property}["'][^>]+content=["']([^"']+)["']`, "i")) ||
                    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${property}["']`, "i"));
      return match ? match[1] : null;
    };

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = getMeta("title") || (titleMatch ? titleMatch[1] : null) || url;
    const description = getMeta("description");
    const image = getMeta("image");
    const siteName = getMeta("site_name");

    return Response.json({
      title,
      description,
      image,
      siteName,
      url
    });
  } catch (err) {
    console.error("[OG API] Error fetching metadata:", err);
    return Response.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}
