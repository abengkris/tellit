"use server";

import { WoTService } from "@/services/wot.service";
import { verifySession } from "@/lib/dal";

export type WoTInitResult = {
  success: boolean;
  d1?: string[];
  cached?: boolean;
  count?: number;
  error?: string;
};

/**
 * Server Action to initialize Web of Trust for a user.
 */
export async function initializeWoTAction(pubkey: string): Promise<WoTInitResult> {
  try {
    if (!pubkey) {
      return { success: false, error: "Pubkey is required" };
    }

    // Secure check: Ensure requester owns the pubkey
    const session = await verifySession();
    if (!session || session.pubkey !== pubkey) {
      return { success: false, error: "Unauthorized" };
    }

    // Trigger WoT initialization
    const { d1, cached } = await WoTService.initializeWoT(pubkey);

    // Optionally revalidate some data if we were using Next.js cache for WoT
    // revalidateTag(`wot-${pubkey}`);

    return {
      success: true,
      d1,
      cached,
      count: d1.length
    };
  } catch (error) {
    console.error("[WoT Action] Initialization failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

/**
 * Server Action to check trust levels for a batch of pubkeys.
 */
export async function checkTrustAction(viewerPubkey: string, pubkeys: string[]) {
  try {
    if (!viewerPubkey || !pubkeys || !Array.isArray(pubkeys)) {
      return { success: false, error: "viewerPubkey and an array of pubkeys are required" };
    }

    const session = await verifySession();
    if (!session || session.pubkey !== viewerPubkey) {
      return { success: false, error: "Unauthorized" };
    }

    if (pubkeys.length > 500) {
      return { success: false, error: "Too many pubkeys. Maximum 500 allowed." };
    }

    const network = await WoTService.checkTrust(viewerPubkey, pubkeys);

    return {
      success: true,
      network,
      viewer: viewerPubkey
    };
  } catch (error) {
    console.error("[WoT Action] Trust check failed:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
