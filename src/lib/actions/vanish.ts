import NDK, { NDKEvent, NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { addClientTag } from "@/lib/utils/nostr";
import { clientLogger } from "../logger/client";

/**
 * Request to Vanish (NIP-62).
 * Requests relays to delete all events associated with the user's pubkey.
 * @param ndk The NDK instance
 * @param relays Array of relay URLs to vanish from, or ["ALL_RELAYS"] for global request
 * @param reason Optional reason or legal notice
 */
export const requestVanish = async (
  ndk: NDK,
  relays: string[],
  reason: string = "Request to vanish under NIP-62"
): Promise<NDKEvent> => {
  if (!ndk.signer) throw new Error("Signer required for vanish request");

  const event = new NDKEvent(ndk);
  event.kind = 62 as NDKKind;
  event.content = reason;

  // NIP-62 tags
  relays.forEach(url => {
    event.tags.push(["relay", url]);
  });

  addClientTag(event);
  await event.sign();
  
  // If global request, broadcast to all relays
  if (relays.includes("ALL_RELAYS")) {
    await event.publish();
  } else {
    // Publish to specific relays
    for (const url of relays) {
      try {
        const relay = ndk.pool.getRelay(url);
        if (relay) {
          await event.publish(new NDKRelaySet(new Set([relay]), ndk));
        }
      } catch (e) {
        await clientLogger.error(`Failed to publish vanish request to ${url}`, e as Error);
      }
    }
  }

  return event;
};
