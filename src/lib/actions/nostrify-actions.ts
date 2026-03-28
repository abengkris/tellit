import { type NostrEvent, type NostrSigner } from "@nostrify/types";
import { createRelayPool } from "../nostrify-relay";
import { DEFAULT_RELAYS } from "../ndk";

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
    pool.event(giftWrap).catch(err => {
      console.error("[NostrifyActions] Failed to publish gift wrap to relays:", err);
    });

    // Also wrap for self (self-copy)
    const myPubkey = await signer.getPublicKey();
    if (myPubkey !== recipient) {
      const selfGiftWrap = await wrapMessage(rumor, myPubkey, signer);
      pool.event(selfGiftWrap).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error("[NostrifyActions] Failed to send message:", err);
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
    console.error("[NostrifyActions] Failed to publish status:", error);
    return false;
  }
}
