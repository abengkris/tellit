import NDK, { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";
import { addClientTag } from "@/lib/utils/nostr";
import { publishLabel } from "./labels";

export type ReportType = "nudity" | "malware" | "profanity" | "illegal" | "spam" | "impersonation" | "other";

/**
 * Report a user or an event (NIP-56 and NIP-32).
 * Sends a kind 1984 report event and a kind 1985 label event to the relays.
 * @param blobHash Optional hash of a blob being reported (NIP-56 'x' tag)
 * @param blobServer Optional URL of the server hosting the blob
 */
export const reportContent = async (
  ndk: NDK,
  reportType: ReportType,
  targetPubkey: string,
  targetEventId?: string,
  reason: string = "",
  blobHash?: string,
  blobServer?: string
): Promise<boolean> => {
  if (!ndk.signer) throw new Error("No signer available");

  try {
    // 1. NIP-56 Report (Kind 1984)
    const reportEvent = new NDKEvent(ndk);
    reportEvent.kind = 1984;
    
    const reportTags: NDKTag[] = [
      ["p", targetPubkey, reportType]
    ];

    if (targetEventId) {
      reportTags.push(["e", targetEventId, reportType]);
    }

    if (blobHash) {
      reportTags.push(["x", blobHash, reportType]);
      if (blobServer) {
        reportTags.push(["server", blobServer]);
      }
    }

    reportEvent.tags = reportTags;
    reportEvent.content = reason;
    
    addClientTag(reportEvent);
    await reportEvent.sign();
    await reportEvent.publish();

    // 2. NIP-32 Label (Kind 1985)
    // Using reverse domain for moderation labels as suggested by NIP-32
    const labelNamespace = "id.tellit.moderation";
    const labelTargets: NDKTag[] = [
      ["p", targetPubkey]
    ];
    if (targetEventId) {
      labelTargets.push(["e", targetEventId]);
    }
    if (blobHash) {
      labelTargets.push(["x", blobHash]);
    }

    await publishLabel(ndk, labelNamespace, reportType, labelTargets, reason);

    return true;
  } catch (err) {
    console.error("Failed to send report/label:", err);
    return false;
  }
};
