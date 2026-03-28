import { type NostrEvent } from "@nostrify/types";

export interface ReactionTarget {
  id: string;
  pubkey: string;
  kind: number;
  relay?: string;
}

/**
 * Builds a Nostrify event template (Kind 7) for reactions.
 * @param target The event being reacted to
 * @param content The reaction content ('+' for like, '-' for dislike, or emoji)
 * @param emojiUrl Optional URL for NIP-30 custom emoji
 */
export function buildReactionTemplate(
  target: ReactionTarget,
  content: string = "+",
  emojiUrl?: string
): Omit<NostrEvent, 'id' | 'pubkey' | 'sig' | 'created_at'> {
  const tags: string[][] = [];

  const eTag = ["e", target.id];
  if (target.relay) eTag.push(target.relay);
  tags.push(eTag);

  const pTag = ["p", target.pubkey];
  if (target.relay) pTag.push(target.relay);
  tags.push(pTag);

  tags.push(["k", String(target.kind)]);

  // NIP-25: Add 'a' tag for addressable events (kind 30000-39999)
  if (target.kind >= 30000 && target.kind < 40000) {
    // Note: We don't have the full event here to find the 'd' tag easily, 
    // but we can pass it in ReactionTarget if needed.
    // For now, assume Kind 1 or standard events.
  }

  // NIP-30: Custom Emoji Reaction
  if (emojiUrl && content.startsWith(":") && content.endsWith(":")) {
    const shortcode = content.slice(1, -1);
    tags.push(["emoji", shortcode, emojiUrl]);
  }

  return {
    kind: 7,
    content,
    tags,
  };
}
