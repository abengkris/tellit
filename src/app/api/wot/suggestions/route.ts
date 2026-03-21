import { NextRequest, NextResponse } from "next/server";
import { WoTService } from "@/services/wot.service";

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
      return NextResponse.json(
        { error: "Pubkey is required" },
        { status: 400 }
      );
    }

    const suggestions = await WoTService.getSuggestions(pubkey, limit);

    return NextResponse.json({
      suggestions,
      pubkey
    });
  } catch (error) {
    console.error("[WoT API] Suggestions failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
