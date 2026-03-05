import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { ProfileMetadata } from "@/hooks/useProfile";

/**
 * Update user profile metadata (kind 0).
 */
export async function updateProfile(
  ndk: NDK,
  metadata: ProfileMetadata
): Promise<boolean> {
  if (!ndk.signer) {
    throw new Error("No signer available");
  }

  try {
    const user = await ndk.signer.user();
    const event = new NDKEvent(ndk);
    event.kind = 0;
    event.content = JSON.stringify(metadata);
    
    // We should probably sign and publish
    await event.publishReplaceable();
    
    // Update local user object if possible or just rely on relay refresh
    return true;
  } catch (error) {
    console.error("Failed to update profile:", error);
    return false;
  }
}

/**
 * Update user status (kind 30315).
 */
export async function updateStatus(
  ndk: NDK,
  content: string,
  type: string = "general",
  expiration?: number,
  link?: string
): Promise<boolean> {
  if (!ndk.signer) return false;

  try {
    const event = new NDKEvent(ndk);
    event.kind = 30315;
    event.content = content;
    event.tags = [["d", type]];
    
    if (expiration) {
      event.tags.push(["expiration", expiration.toString()]);
    }
    
    if (link) {
      event.tags.push(["r", link]);
    }

    await event.publishReplaceable();
    return true;
  } catch (error) {
    console.error("Failed to update status:", error);
    return false;
  }
}

/**
 * Clear a specific user status.
 */
export async function clearStatus(ndk: NDK, type: string = "general"): Promise<boolean> {
  return updateStatus(ndk, "", type);
}
