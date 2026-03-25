import { NextRequest } from "next/server";
import { WoTService } from "@/services/wot.service";
import { verifySession } from "@/lib/dal";
import { apiError, apiSuccess } from "@/lib/api-utils";

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
      return apiError("viewerPubkey and an array of pubkeys are required", 400);
    }

    // Secure check: Ensure requester owns the viewerPubkey
    const session = await verifySession();
    if (!session || session.pubkey !== viewerPubkey) {
      return apiError("Unauthorized", 403);
    }

    // Cap the request size to prevent Redis abuse
    if (pubkeys.length > 500) {
      return apiError("Too many pubkeys. Maximum 500 allowed.", 400);
    }

    const network = await WoTService.checkTrust(viewerPubkey, pubkeys);

    return apiSuccess({
      network,
      viewer: viewerPubkey
    });
  } catch (error) {
    return apiError("Internal Server Error", 500, error);
  }
}
