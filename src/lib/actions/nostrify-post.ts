import { type NostrEvent } from "@nostrify/types";
import { NDKEvent } from "@nostr-dev-kit/ndk";

export interface ZapSplit {
  pubkey: string;
  relay?: string;
  weight: number;
}

export interface PostOptions {
  replyTo?: NDKEvent;
  quoteEvent?: NDKEvent;
  tags?: string[][];
  zapSplits?: ZapSplit[];
  subject?: string;
  labels?: { namespace: string; label: string }[];
  contentWarning?: string;
}

/**
 * Builds a Nostrify event template (Kind 1) from microblogging options.
 * Handles NIP-10 replies, NIP-18 quotes, NIP-14 subjects, etc.
 */
export function buildPostTemplate(content: string, options: PostOptions = {}): Omit<NostrEvent, 'id' | 'pubkey' | 'sig' | 'created_at'> {
  let finalContent = content;
  const tags: string[][] = options.tags ? [...options.tags] : [];

  // 1. Handle Subject
  let effectiveSubject = options.subject;
  if (!effectiveSubject && options.replyTo) {
    const parentSubject = options.replyTo.tags.find(t => t[0] === 'subject')?.[1];
    if (parentSubject) {
      effectiveSubject = parentSubject.startsWith("Re: ") ? parentSubject : `Re: ${parentSubject}`;
    }
  }
  if (effectiveSubject) {
    tags.push(["subject", effectiveSubject]);
  }

  // 2. Handle Content Warning
  if (options.contentWarning) {
    tags.push(["content-warning", options.contentWarning]);
  }

  // 3. Handle Labels
  if (options.labels) {
    options.labels.forEach(({ namespace, label }) => {
      tags.push(["L", namespace]);
      tags.push(["l", label, namespace]);
    });
  }

  // 4. Handle Zap Splits
  if (options.zapSplits) {
    options.zapSplits.forEach(split => {
      tags.push(["zap", split.pubkey, split.relay || "", String(split.weight)]);
    });
  }

  // 5. Handle Quote
  if (options.quoteEvent) {
    const q = options.quoteEvent;
    tags.push(["q", q.id, q.onRelays?.[0]?.url || "", q.pubkey]);
    const nostrUri = q.encode();
    if (!content.includes(nostrUri)) {
      finalContent += `\n\nnostr:${nostrUri}`;
    }
  }

  // 6. Handle Reply (NIP-10)
  if (options.replyTo) {
    const parent = options.replyTo;
    const rootTag = parent.tags.find((t) => t[0] === "e" && t[3] === "root");
    const rootId = rootTag ? rootTag[1] : parent.id;

    tags.push(["e", rootId, "", "root"]);
    if (rootId !== parent.id) {
      tags.push(["e", parent.id, "", "reply"]);
    }
    tags.push(["p", parent.pubkey]);
  }

  // 7. Add Hashtags
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [...content.matchAll(hashtagRegex)].map((m) => m[1]);
  hashtags.forEach((tag) => {
    if (!tags.some(t => t[0] === 't' && t[1] === tag.toLowerCase())) {
      tags.push(["t", tag.toLowerCase()]);
    }
  });

  return {
    kind: 1,
    content: finalContent,
    tags,
  };
}
