import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { ProfileMetadata } from "@/hooks/useProfile";
import { addClientTag } from "@/lib/utils/nostr";
import { clientLogger } from "../logger/client";

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
    const event = new NDKEvent(ndk);
    event.kind = 0;
    event.content = JSON.stringify(metadata);
    
    addClientTag(event);
    // sign and publish optimistically (fire and forget)
    await event.sign();
    event.publishReplaceable();
    
    return true;
  } catch (error) {
    await clientLogger.error("Failed to update profile", error as Error);
    return false;
  }
}

/**
 * Specifically update the NIP-05 and Lightning Address (lud16) fields of a profile.
 */
export async function updateProfileNIP05(
  ndk: NDK,
  nip05: string
): Promise<boolean> {
  if (!ndk.signer) return false;

  try {
    const user = await ndk.signer.user();
    await user.fetchProfile();
    
    // We set both NIP-05 and LUD16 to the same handle
    // username@tellit.id works for both identity and payments
    const metadata = {
      ...(user.profile || {}),
      nip05,
      lud16: nip05 
    };

    return updateProfile(ndk, metadata);
  } catch (error) {
    await clientLogger.error("Failed to update NIP-05/LUD16 profile", error as Error);
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

    addClientTag(event);
    await event.sign();
    event.publishReplaceable();
    return true;
  } catch (error) {
    await clientLogger.error("Failed to update status", error as Error);
    return false;
  }
}

/**
 * Clear a specific user status.
 */
export async function clearStatus(ndk: NDK, type: string = "general"): Promise<boolean> {
  return updateStatus(ndk, "", type);
}

/**
 * Pin a post to user profile (Kind 10005).
 */
export async function pinPost(eventId: string): Promise<boolean> {
  console.log("Mock pinPost called for", eventId);
  return true;
}

/**
 * Unpin a post (Kind 10005).
 */
export async function unpinPost(eventId: string): Promise<boolean> {
  console.log("Mock unpinPost called for", eventId);
  return true;
}

/**
 * Mute a user (Kind 10000).
 */
export async function muteUser(pubkey: string): Promise<boolean> {
  console.log("Mock muteUser called for", pubkey);
  return true;
}

/**
 * Unmute a user (Kind 10000).
 */
export async function unmuteUser(pubkey: string): Promise<boolean> {
  console.log("Mock unmuteUser called for", pubkey);
  return true;
}
