import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";

/**
 * Send a NIP-25 reaction to a specific Nostr event.
 * @param ndk The NDK instance
 * @param targetEvent The event being reacted to
 * @param content The reaction content ('+' for like, '-' for dislike)
 */
export const reactToEvent = async (
  ndk: NDK,
  targetEvent: NDKEvent,
  content: string = "+"
): Promise<NDKEvent> => {
  const reaction = new NDKEvent(ndk);
  reaction.kind = 7;
  reaction.content = content;
  
  // NIP-25 tags: e (event ID) and p (author pubkey)
  reaction.tags = [
    ["e", targetEvent.id],
    ["p", targetEvent.pubkey]
  ];

  await reaction.sign();
  // Fire and forget (optimistic)
  reaction.publish();
  return reaction;
};
