import { type NostrEvent, type NostrSigner, type NostrFilter } from "@nostrify/types";
import { createRelayPool } from "../nostrify-relay";
import { DEFAULT_RELAYS } from "../ndk";
import { clientLogger } from "../logger/client";

/**
 * Builds a NIP-17 Rumor (Kind 14).
 */
export function buildRumor(content: string, recipient: string): Omit<NostrEvent, 'id' | 'pubkey' | 'sig' | 'created_at'> {
  return {
    kind: 14,
    content,
    tags: [["p", recipient]],
  };
}

/**
 * Wraps a Rumor into a Gift Wrap (Kind 1059) according to NIP-17.
 */
export async function wrapMessage(
  rumorTemplate: Omit<NostrEvent, 'id' | 'pubkey' | 'sig' | 'created_at'>,
  recipient: string,
  signer: NostrSigner
): Promise<NostrEvent> {
  const senderPubkey = await signer.getPublicKey();
  
  // 1. Create the Rumor
  const rumor: Omit<NostrEvent, 'id' | 'sig'> = {
    ...rumorTemplate,
    pubkey: senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
  };

  // 2. Encrypt the Rumor for the recipient
  if (!signer.nip44) throw new Error("Signer does not support NIP-44 encryption");
  const encryptedRumor = await signer.nip44.encrypt(recipient, JSON.stringify(rumor));

  // 3. Create the Gift Wrap (Kind 1059)
  const giftWrapTemplate: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'> = {
    kind: 1059,
    content: encryptedRumor,
    tags: [["p", recipient]],
    created_at: Math.floor(Date.now() / 1000),
  };

  return signer.signEvent(giftWrapTemplate);
}

/**
 * High-level function to send a NIP-17 message using Nostrify.
 */
export async function sendNostrifyMessage(
  content: string,
  recipient: string,
  signer: NostrSigner,
  relays: string[] = DEFAULT_RELAYS
): Promise<boolean> {
  try {
    const rumor = buildRumor(content, recipient);
    
    // Wrap for recipient
    const giftWrap = await wrapMessage(rumor, recipient, signer);
    
    const pool = createRelayPool(relays);
    
    // Fire and forget
    pool.event(giftWrap).catch(async (err) => {
      await clientLogger.error("[NostrifyActions] Failed to publish gift wrap to relays", err as Error);
    });

    // Also wrap for self (self-copy)
    const myPubkey = await signer.getPublicKey();
    if (myPubkey !== recipient) {
      const selfGiftWrap = await wrapMessage(rumor, myPubkey, signer);
      pool.event(selfGiftWrap).catch(() => {});
    }

    return true;
  } catch (err) {
    await clientLogger.error("[NostrifyActions] Failed to send message", err as Error);
    return false;
  }
}

/**
 * Publishes a user status (Kind 30315) using Nostrify.
 */
export async function publishStatus(
  content: string,
  signer: NostrSigner,
  type: string = "general",
  expiration?: number,
  link?: string,
  relays: string[] = DEFAULT_RELAYS
): Promise<boolean> {
  try {
    const tags = [["d", type]];
    if (expiration) tags.push(["expiration", expiration.toString()]);
    if (link) tags.push(["r", link]);

    const eventTemplate = {
      kind: 30315,
      content,
      tags,
      created_at: Math.floor(Date.now() / 1000),
    };

    const signed = await signer.signEvent(eventTemplate);
    const pool = createRelayPool(relays);
    
    await pool.event(signed);
    return true;
  } catch (error) {
    await clientLogger.error("[NostrifyActions] Failed to publish status", error as Error);
    return false;
  }
}

export interface PublishArticleOptions {
  title: string;
  summary?: string;
  image?: string;
  tags?: string[];
  d: string;
  published_at?: number;
}

/**
 * Publishes a long-form article (Kind 30023) using Nostrify.
 */
export async function publishNostrifyArticle(
  content: string,
  signer: NostrSigner,
  options: PublishArticleOptions,
  relays: string[] = DEFAULT_RELAYS
): Promise<boolean> {
  try {
    const tags: string[][] = [
      ["d", options.d],
      ["title", options.title],
    ];

    if (options.summary) tags.push(["summary", options.summary]);
    if (options.image) tags.push(["image", options.image]);
    if (options.published_at) tags.push(["published_at", options.published_at.toString()]);
    
    if (options.tags) {
      options.tags.forEach(t => tags.push(["t", t]));
    }

    const eventTemplate = {
      kind: 30023,
      content,
      tags,
      created_at: Math.floor(Date.now() / 1000),
    };

    const signed = await signer.signEvent(eventTemplate);
    const pool = createRelayPool(relays);
    
    await pool.event(signed);
    return true;
  } catch (error) {
    await clientLogger.error("[NostrifyActions] Failed to publish article", error as Error);
    return false;
  }
}

/**
 * Listens for zap receipts (Kind 9735) using Nostrify.
 */
export function listenForNostrifyZapReceipt(
  targetId: string,
  onReceipt: (receipt: NostrEvent) => void,
  isUser: boolean = false,
  relays: string[] = DEFAULT_RELAYS
): () => void {
  const pool = createRelayPool(relays);
  const filter: NostrFilter = { kinds: [9735] };
  
  if (isUser) {
    filter["#p"] = [targetId];
  } else {
    filter["#e"] = [targetId];
  }

  const abortController = new AbortController();
  const stream = pool.req([filter], { signal: abortController.signal });

  (async () => {
    try {
      for await (const msg of stream) {
        if (msg[0] === 'EVENT') {
          onReceipt(msg[2]);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      await clientLogger.error("[NostrifyActions] Zap receipt stream error", e as Error);
    }
  })();

  return () => {
    abortController.abort();
  };
}
