import NDK, { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { addClientTag } from "@/lib/utils/nostr";

/**
 * Send a NIP-25 reaction to a specific Nostr event.
 * @param ndk The NDK instance
 * @param targetEvent The event being reacted to
 * @param content The reaction content ('+' for like, '-' for dislike, or emoji)
 * @param emojiUrl Optional URL for NIP-30 custom emoji
 */
export const reactToEvent = async (
  ndk: NDK,
  targetEvent: NDKEvent,
  content: string = "+",
  emojiUrl?: string
): Promise<NDKEvent> => {
  const reaction = new NDKEvent(ndk);
  reaction.kind = 7;
  reaction.content = content;
  
  // Find a relay hint from targetEvent's seenOn or active relays
  const relayHint = targetEvent.onRelays?.[0]?.url || "";

  // NIP-25 tags: e (event ID) and p (author pubkey)
  reaction.tags = [
    ["e", targetEvent.id, relayHint, targetEvent.pubkey],
    ["p", targetEvent.pubkey, relayHint],
    ["k", String(targetEvent.kind)],
    ["alt", `This is a reaction to a post: ${content}`]
  ];

  // NIP-25: Add 'a' tag for addressable events (kind 30000-39999)
  if (targetEvent.kind >= 30000 && targetEvent.kind < 40000) {
    const dTag = targetEvent.tags.find(t => t[0] === 'd')?.[1] || "";
    reaction.tags.push(["a", `${targetEvent.kind}:${targetEvent.pubkey}:${dTag}`, relayHint]);
  }

  // NIP-30: Custom Emoji Reaction
  if (emojiUrl && content.startsWith(":") && content.endsWith(":")) {
    const shortcode = content.slice(1, -1);
    reaction.tags.push(["emoji", shortcode, emojiUrl]);
  }

  addClientTag(reaction);
  await reaction.sign();
  // Fire and forget (optimistic)
  reaction.publish();
  return reaction;
};

/**
 * Send a NIP-25 / NIP-73 external reaction (kind 17).
 * @param ndk The NDK instance
 * @param type The external content type (e.g. 'web', 'podcast:guid')
 * @param identifier The external content identifier (URL or GUID)
 * @param content The reaction content
 */
export const reactToExternal = async (
  ndk: NDK,
  type: string,
  identifier: string,
  content: string = "+",
  relayHint: string = ""
): Promise<NDKEvent> => {
  const reaction = new NDKEvent(ndk);
  reaction.kind = 17 as NDKKind;
  reaction.content = content;
  
  reaction.tags = [
    ["k", type],
    ["i", identifier, relayHint]
  ];

  addClientTag(reaction);
  await reaction.sign();
  reaction.publish();
  return reaction;
};
