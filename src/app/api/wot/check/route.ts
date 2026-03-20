import { NextRequest, NextResponse } from "next/server";
import { WoTService } from "@/services/wot.service";

/**
 * POST /api/wot/check
 * { "viewerPubkey": "...", "pubkeys": ["...", "..."] }
 * 
 * Batch checks the trust degree for a list of pubkeys relative to a viewer.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { viewerPubkey, pubkeys } = body;

    if (!viewerPubkey || !pubkeys || !Array.isArray(pubkeys)) {
      return NextResponse.json(
        { error: "viewerPubkey and an array of pubkeys are required" },
        { status: 400 }
      );
    }

    // Cap the request size to prevent Redis abuse
    if (pubkeys.length > 500) {
      return NextResponse.json(
        { error: "Too many pubkeys. Maximum 500 allowed." },
        { status: 400 }
      );
    }

    const network = await WoTService.checkTrust(viewerPubkey, pubkeys);

    return NextResponse.json({
      network,
      viewer: viewerPubkey
    });
  } catch (error) {
    console.error("[WoT API] Trust check failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
