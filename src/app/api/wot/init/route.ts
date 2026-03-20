import { NextRequest, NextResponse } from "next/server";
import { WoTService } from "@/services/wot.service";
import { waitUntil } from "next/server";

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
      return NextResponse.json(
        { error: "Pubkey is required" },
        { status: 400 }
      );
    }

    // Pass waitUntil to ensure background task survives
    const { d1, cached, backgroundPromise } = await WoTService.initializeWoT(pubkey);

    if (backgroundPromise) {
      waitUntil(backgroundPromise);
    }

    return NextResponse.json({
      d1,
      cached,
      count: d1.length,
      status: "initialized"
    });
  } catch (error) {
    console.error("[WoT API] Initialization failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
