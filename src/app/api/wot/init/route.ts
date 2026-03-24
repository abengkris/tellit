import { NextRequest } from "next/server";
import { WoTService } from "@/services/wot.service";
import { verifySession } from "@/lib/dal";

/**
 * POST /api/wot/init
 * { "pubkey": "..." }
 * 
 * Initializes the Web of Trust for the given user.
 * Fetches D1 synchronously and returns it.
 * Triggers D2 fetch in the background.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pubkey } = body;

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

    // Trigger WoT initialization
    const { d1, cached } = await WoTService.initializeWoT(pubkey);

    return Response.json({
      d1,
      cached,
      count: d1.length,
      status: "initialized"
    });
  } catch (error) {
    console.error("[WoT API] Initialization failed:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
