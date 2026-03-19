import NDK, { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";
import { addClientTag } from "@/lib/utils/nostr";

export type ReportType = "nudity" | "malware" | "profanity" | "illegal" | "spam" | "impersonation" | "other";

/**
 * Report a user or an event (NIP-56).
 * Sends a kind 1984 report event to the relays.
 */
export const reportContent = async (
  ndk: NDK,
  reportType: ReportType,
  targetPubkey: string,
  targetEventId?: string,
  reason: string = ""
): Promise<boolean> => {
  if (!ndk.signer) throw new Error("No signer available");

  try {
    const event = new NDKEvent(ndk);
    event.kind = 1984;
    
    const tags: NDKTag[] = [
      ["p", targetPubkey, reportType]
    ];

    if (targetEventId) {
      tags.push(["e", targetEventId, reportType]);
    }

    event.tags = tags;
    event.content = reason;
    
    addClientTag(event);
    await event.sign();
    await event.publish();
    return true;
  } catch (err) {
    console.error("Failed to send report:", err);
    return false;
  }
};
