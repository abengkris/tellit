import { NextRequest } from "next/server";
import { WoTService } from "@/services/wot.service";
import { verifySession } from "@/lib/dal";


/**
 * GET /api/wot/suggestions?pubkey=...&limit=...
 * 
 * Returns follow suggestions based on the user's D2 network in Redis.
 */
export async function GET(req: NextRequest) {
  
  

  try {
    const pubkey = req.nextUrl.searchParams.get("pubkey");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

    if (!pubkey) {
      return Response.json(
        { error: "Pubkey is required" },
        { status: 400 }
      );
    }

    // Secure check: Ensure requester owns the pubkey
    const session = await verifySession();
    if (!session || session.pubkey !== pubkey) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const suggestions = await WoTService.getSuggestions(pubkey, limit);

    return Response.json({
      suggestions,
      pubkey
    });
  } catch (error) {
    console.error("[WoT API] Suggestions failed:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
