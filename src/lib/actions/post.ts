import NDK, { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";

interface PostOptions {
  replyTo?: NDKEvent;
  tags?: NDKTag[];
}

export const publishPost = async (
  ndk: NDK,
  content: string,
  options?: PostOptions
): Promise<NDKEvent> => {
  const event = new NDKEvent(ndk);
  event.kind = 1;
  event.content = content;

  if (options?.tags) {
    event.tags = [...options.tags];
  }

  // 1. Handle Hashtags (#nostr) -> t tags
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [...content.matchAll(hashtagRegex)].map((m) => m[1]);
  hashtags.forEach((tag) => {
    event.tags.push(["t", tag.toLowerCase()]);
  });

  // 2. Handle Mentions (@npub...) -> p tags
  const npubRegex = /@(npub1[0-9a-z]+)/g;
  const mentions = [...content.matchAll(npubRegex)];
  for (const match of mentions) {
    try {
      const npub = match[1];
      const { data: pubkey } = nip19.decode(npub);
      if (typeof pubkey === "string") {
        event.tags.push(["p", pubkey, "", "mention"]);
      }
    } catch (e) {
      console.warn("Invalid npub in mention:", match[1]);
    }
  }

  // 3. Handle Reply (NIP-10 or NIP-22)
  if (options?.replyTo) {
    const parent = options.replyTo;
    
    // NIP-22 Comments (Kind 1111)
    // Used when replying to Kind 30023 or nested Kind 1111
    if (parent.kind === 30023 || parent.kind === 1111) {
      event.kind = 1111;
      
      let rootId = "";
      let rootKind = "";
      let rootPubkey = "";

      if (parent.kind === 30023) {
        rootId = parent.id;
        rootKind = "30023";
        rootPubkey = parent.pubkey;
      } else {
        // Parent is a comment, find its root from uppercase tags
        const E = parent.tags.find(t => t[0] === 'E')?.[1];
        const K = parent.tags.find(t => t[0] === 'K')?.[1];
        const P = parent.tags.find(t => t[0] === 'P')?.[1];
        
        rootId = E || parent.id;
        rootKind = K || "30023"; // Fallback to 30023 if not found
        rootPubkey = P || parent.pubkey;
      }

      // Root tags (Uppercase)
      event.tags.push(["E", rootId]);
      event.tags.push(["K", rootKind]);
      event.tags.push(["P", rootPubkey]);

      // Parent tags (Lowercase)
      event.tags.push(["e", parent.id]);
      event.tags.push(["k", String(parent.kind)]);
      event.tags.push(["p", parent.pubkey]);
    } 
    // Standard NIP-10 Replies (Kind 1)
    else {
      const rootTag = parent.tags.find((t) => t[0] === "e" && t[3] === "root");
      const rootId = rootTag ? rootTag[1] : parent.id;

      event.tags.push(["e", rootId, "", "root"]);
      if (rootId !== parent.id) {
        event.tags.push(["e", parent.id, "", "reply"]);
      }
      event.tags.push(["p", parent.pubkey]);
    }
  }

  // 4. Publish
  await event.publish();
  return event;
};

/**
 * Delete a post (NIP-09).
 * Sends a kind 5 deletion request to the relays.
 */
export const deletePost = async (ndk: NDK, eventId: string): Promise<boolean> => {
  if (!ndk.signer) throw new Error("No signer available");

  try {
    const event = new NDKEvent(ndk);
    event.kind = 5;
    event.tags = [["e", eventId]];
    event.content = "Deletion request from Sapa";
    
    await event.sign();
    await event.publish();
    return true;
  } catch (err) {
    console.error("Failed to delete post:", err);
    return false;
  }
};
