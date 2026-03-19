import NDK, { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { addClientTag } from "@/lib/utils/nostr";
import { RelayMetadata } from "@/hooks/useRelayList";

/**
 * Updates the user's relay list (Kind 10002).
 */
export async function updateRelayList(ndk: NDK, relays: RelayMetadata[]): Promise<boolean> {
  if (!ndk.signer) {
    throw new Error("Signer required to update relay list");
  }

  try {
    const event = new NDKEvent(ndk);
    event.kind = 10002;
    event.content = "";
    
    relays.forEach(r => {
      const tag = ["r", r.url];
      if (r.read && !r.write) tag.push("read");
      else if (!r.read && r.write) tag.push("write");
      // If both read and write, no marker is needed per NIP-65, 
      // but some clients prefer explicit. NIP-65 says omitting marker means both.
      event.tags.push(tag);
    });

    addClientTag(event);
    await event.publish();
    return true;
  } catch (error) {
    console.error("Failed to update relay list:", error);
    return false;
  }
}
