import NDK, { NDKEvent, NDKTag, NDKArticle, NDKDVMRequest, NDKKind, nip19 } from "@nostr-dev-kit/ndk";

import { createPoll, CreatePollOptions } from "./poll";
import { addClientTag } from "@/lib/utils/nostr";

export interface ZapSplit {
  pubkey: string;
  relay?: string;
  weight: number;
}

interface PostOptions {
  replyTo?: NDKEvent;
  quoteEvent?: NDKEvent;
  pollOptions?: CreatePollOptions;
  tags?: NDKTag[];
  emojis?: Map<string, string>;
  zapSplits?: ZapSplit[];
  subject?: string;
}

export const publishPost = async (
  ndk: NDK,
  content: string,
  options?: PostOptions
): Promise<NDKEvent> => {
  // Determine subject if not provided but it's a reply
  let effectiveSubject = options?.subject;
  if (!effectiveSubject && options?.replyTo) {
    const parentSubject = options.replyTo.tags.find(t => t[0] === 'subject')?.[1];
    if (parentSubject) {
      effectiveSubject = parentSubject.startsWith("Re: ") ? parentSubject : `Re: ${parentSubject}`;
    }
  }

  // If poll options provided, use kind 1068
  if (options?.pollOptions) {
    return createPoll(ndk, content, {
      ...options.pollOptions,
      subject: effectiveSubject
    });
  }

  const event = new NDKEvent(ndk);
  event.kind = 1;
  event.content = content;

  if (options?.tags) {
    event.tags = [...options.tags];
  }

  // Handle NIP-14 Subject
  if (effectiveSubject) {
    event.tags.push(["subject", effectiveSubject]);
  }

  // Handle Zap Splits (NIP-57 / NIP-01 zap tags)
  if (options?.zapSplits && options.zapSplits.length > 0) {
    options.zapSplits.forEach(split => {
      // zap tag format: ["zap", pubkey, relay, weight]
      event.tags.push(["zap", split.pubkey, split.relay || "", String(split.weight)]);
    });
  }

  // 0. Handle Custom Emojis (NIP-30)
  if (options?.emojis) {
    const emojiRegex = /:([a-zA-Z0-9_]+):/g;
    const emojiMatches = [...content.matchAll(emojiRegex)];
    emojiMatches.forEach((match) => {
      const shortcode = match[1];
      const url = options.emojis?.get(shortcode);
      if (url && !event.tags.some(t => t[0] === 'emoji' && t[1] === shortcode)) {
        event.tags.push(["emoji", shortcode, url]);
      }
    });
  }

  // 1. Handle Quote (NIP-18)
  if (options?.quoteEvent) {
    const q = options.quoteEvent;
    const relayUrl = q.onRelays?.[0]?.url || "";
    event.tags.push(["q", q.id, relayUrl, q.pubkey]);
    
    // Automatically append the nostr: URI if not present in content
    const nostrUri = q.encode();
    if (!content.includes(nostrUri)) {
      event.content += `\n\nnostr:${nostrUri}`;
    }
  }

  // Automatic Quote tags from NIP-21 entities in content (nostr:nevent, nostr:note, nostr:naddr)
  const nip21Regex = /nostr:((?:nevent1|note1|naddr1)[0-9a-z]+)/gi;
  const nip21Matches = [...content.matchAll(nip21Regex)];
  
  for (const match of nip21Matches) {
    const bech32 = match[1];
    try {
      const decoded = nip19.decode(bech32);
      let targetId = "";
      let pubkey = "";
      let relay = "";

      if (decoded.type === 'nevent') {
        targetId = decoded.data.id;
        pubkey = decoded.data.author || "";
        relay = decoded.data.relays?.[0] || "";
      } else if (decoded.type === 'note') {
        targetId = decoded.data as string;
      } else if (decoded.type === 'naddr') {
        const d = decoded.data;
        targetId = `${d.kind}:${d.pubkey}:${d.identifier}`;
        pubkey = d.pubkey;
        relay = d.relays?.[0] || "";
      }

      if (targetId && !event.tags.some(t => t[0] === 'q' && t[1] === targetId)) {
        event.tags.push(["q", targetId, relay, pubkey]);
      }
    } catch (err) {
      // Ignore invalid bech32
    }
  }

  // 2. Handle Hashtags (#nostr) -> t tags
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [...content.matchAll(hashtagRegex)].map((m) => m[1]);
  hashtags.forEach((tag) => {
    event.tags.push(["t", tag.toLowerCase()]);
  });

  // Automatically parse and generate tags for profiles and other entities in content
  await event.generateTags();
  addClientTag(event);

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
    // Fire and forget (optimistic)
    event.publish();
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
  isDraft?: boolean;
  d?: string;
}

export const publishArticle = async (
  ndk: NDK,
  content: string,
  options: ArticleOptions
): Promise<NDKEvent> => {
  const article = new NDKArticle(ndk);
  article.kind = options.isDraft ? 30024 : 30023;
  article.content = content;
  article.title = options.title;
  
  if (options.d) {
    article.tags.push(["d", options.d]);
  }

  if (options.summary) article.summary = options.summary;
  if (options.image) article.image = options.image;

  if (options.tags) {
    options.tags.forEach(t => {
      article.tags.push(["t", t.toLowerCase()]);
    });
  }

  // Handle NIP-23 published_at
  if (!options.isDraft) {
    article.tags.push(["published_at", Math.floor(Date.now() / 1000).toString()]);
  }

  // Handle hashtags in content too
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [...content.matchAll(hashtagRegex)].map((m) => m[1]);
  hashtags.forEach((tag) => {
    if (!article.tags.some(t => t[0] === 't' && t[1] === tag.toLowerCase())) {
      article.tags.push(["t", tag.toLowerCase()]);
    }
  });

  await article.generateTags();
  addClientTag(article);

  await article.sign();
  // Fire and forget (optimistic)
  article.publishReplaceable();
  return article;
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
  
  // NIP-18: kind 6 for kind 1, kind 16 for everything else
  repost.kind = targetEvent.kind === 1 ? 6 : 16;
  
  // Find a relay URL from targetEvent's seenOn or active relays
  const relayUrl = targetEvent.onRelays?.[0]?.url || "";

  repost.tags = [
    ["e", targetEvent.id, relayUrl, "root"],
    ["p", targetEvent.pubkey]
  ];

  // For kind 16 generic reposts, add 'k' tag
  if (repost.kind === 16) {
    repost.tags.push(["k", String(targetEvent.kind)]);
    
    // For replaceable events (NIP-01 / NIP-33), add 'a' tag
    const dTag = targetEvent.tags.find(t => t[0] === 'd')?.[1];
    if (dTag !== undefined) {
      repost.tags.push(["a", `${targetEvent.kind}:${targetEvent.pubkey}:${dTag}`, relayUrl]);
    }
  }

  // NIP-18: content should be stringified JSON of the target event
  // NIP-70: Reposts of protected events SHOULD always have an empty content
  const isProtected = targetEvent.tags.some(t => t[0] === "protected");
  repost.content = isProtected ? "" : JSON.stringify(targetEvent.rawEvent());

  addClientTag(repost);
  await repost.sign();
  // Fire and forget (optimistic)
  repost.publish();
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
    
    addClientTag(event);
    await event.sign();
    // Fire and forget (optimistic)
    event.publish();
    return true;
  } catch (err) {
    console.error("Failed to delete post:", err);
    return false;
  }
};

/**
 * Request a summary of an event using a Data Vending Machine (NIP-90).
 */
export const requestSummarization = async (ndk: NDK, eventToSummarize: NDKEvent): Promise<NDKDVMRequest> => {
  if (!ndk.signer) throw new Error("No signer available");
  
  const req = new NDKDVMRequest(ndk);
  req.kind = NDKKind.DVMReqTextSummarization;
  req.tags.push(["i", eventToSummarize.id, "event"]);
  
  addClientTag(req);
  await req.sign();
  req.publish();
  
  return req;
};

