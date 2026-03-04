import NDK, { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";

import { createPoll, CreatePollOptions } from "./poll";

interface PostOptions {
  replyTo?: NDKEvent;
  quoteEvent?: NDKEvent;
  pollOptions?: CreatePollOptions;
  tags?: NDKTag[];
}

export const publishPost = async (
  ndk: NDK,
  content: string,
  options?: PostOptions
): Promise<NDKEvent> => {
  // If poll options provided, use kind 1068
  if (options?.pollOptions) {
    return createPoll(ndk, content, options.pollOptions);
  }

  const event = new NDKEvent(ndk);
  event.kind = 1;
  event.content = content;

  if (options?.tags) {
    event.tags = [...options.tags];
  }

  // 1. Handle Quote (NIP-18)
  if (options?.quoteEvent) {
    const q = options.quoteEvent;
    event.tags.push(["q", q.id, q.pubkey]);
    
    // Automatically append the nostr: URI if not present in content
    const nostrUri = q.encode();
    if (!content.includes(nostrUri)) {
      event.content += `\n\nnostr:${nostrUri}`;
    }
  }

  // 2. Handle Hashtags (#nostr) -> t tags
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
  try {
    console.log("[Post] Attempting to publish event kind:", event.kind);
    await event.sign();
    await event.publish();
    return event;
  } catch (err) {
    console.error("[Post] Publish failed:", err);
    throw err;
  }
};

export interface ArticleOptions {
  title: string;
  summary?: string;
  image?: string;
  tags?: string[];
}

export const publishArticle = async (
  ndk: NDK,
  content: string,
  options: ArticleOptions
): Promise<NDKEvent> => {
  const event = new NDKEvent(ndk);
  event.kind = 30023;
  event.content = content;
  
  const now = Math.floor(Date.now() / 1000);
  const identifier = `article-${now}`;

  event.tags = [
    ["d", identifier],
    ["title", options.title],
    ["published_at", String(now)],
  ];

  if (options.summary) {
    event.tags.push(["summary", options.summary]);
  }

  if (options.image) {
    event.tags.push(["image", options.image]);
  }

  if (options.tags) {
    options.tags.forEach(t => {
      event.tags.push(["t", t.toLowerCase()]);
    });
  }

  // Handle hashtags in content too
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [...content.matchAll(hashtagRegex)].map((m) => m[1]);
  hashtags.forEach((tag) => {
    if (!event.tags.some(t => t[0] === 't' && t[1] === tag.toLowerCase())) {
      event.tags.push(["t", tag.toLowerCase()]);
    }
  });

  await event.publish();
  return event;
};

/**
 * Repost a Nostr event (NIP-18).
 * @param ndk The NDK instance
 * @param targetEvent The event to be reposted
 */
export const repostEvent = async (
  ndk: NDK,
  targetEvent: NDKEvent
): Promise<NDKEvent> => {
  const repost = new NDKEvent(ndk);
  repost.kind = 6;
  repost.tags = [
    ["e", targetEvent.id, "", "root"],
    ["p", targetEvent.pubkey]
  ];
  // Note: NIP-18 suggests putting the stringified JSON of the target event 
  // in the content, but many clients leave it empty.
  repost.content = "";

  await repost.publish();
  return repost;
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
    event.content = "Deletion request from Tell it!";
    
    await event.sign();
    await event.publish();
    return true;
  } catch (err) {
    console.error("Failed to delete post:", err);
    return false;
  }
};
