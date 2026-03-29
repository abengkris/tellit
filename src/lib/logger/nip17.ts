import { NostrEvent, NostrSigner } from '@nostrify/types';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

/**
 * Creates a NIP-17 Rumor (Kind 14).
 * A Rumor is an unsigned event without an ID.
 */
export function createRumor(
  pubkey: string,
  content: string,
  metadata: Record<string, string> = {}
): Omit<NostrEvent, 'id' | 'sig'> {
  const tags: string[][] = Object.entries(metadata).map(([key, value]) => [key, value]);
  
  return {
    kind: 14,
    pubkey,
    content,
    tags,
    created_at: Math.floor(Date.now() / 1000)
  };
}

/**
 * Wraps a Rumor into a Seal (Kind 13).
 * The Seal is encrypted for the recipient using the sender's signer.
 */
export async function wrapSeal(
  signer: NostrSigner,
  receiverPubkey: string,
  rumor: Omit<NostrEvent, 'id' | 'sig'>
): Promise<NostrEvent> {
  const senderPubkey = await signer.getPublicKey();
  const rumorJson = JSON.stringify(rumor);
  const ciphertext = await signer.nip44.encrypt(receiverPubkey, rumorJson);

  const seal: Omit<NostrEvent, 'id' | 'sig'> = {
    kind: 13,
    pubkey: senderPubkey,
    content: ciphertext,
    tags: [],
    created_at: rumor.created_at
  };

  return signer.signEvent(seal);
}

/**
 * Wraps a Seal into a Gift Wrap (Kind 1059).
 * The Gift Wrap is encrypted for the recipient using a random session key.
 * Gift Wraps are unsigned (sig is ignored by relays, but ID is calculated).
 */
export async function wrapGift(
  receiverPubkey: string,
  seal: NostrEvent
): Promise<NostrEvent> {
  const sessionPrivkey = generateSecretKey();
  const sessionPubkey = getPublicKey(sessionPrivkey);
  const sealJson = JSON.stringify(seal);
  
  // Use a temporary signer for NIP-44 encryption with random session key
  // We don't want to use the main signer here to keep the sender anonymous
  const { nip44 } = await import('nostr-tools');
  const conversationKey = nip44.getConversationKey(sessionPrivkey, receiverPubkey);
  const ciphertext = nip44.encrypt(sealJson, conversationKey);

  const giftWrap: NostrEvent = {
    id: '', // Will be filled by NIP-01 ID calculation if needed, but relays just need kind 1059
    sig: '',
    kind: 1059,
    pubkey: sessionPubkey,
    content: ciphertext,
    tags: [['p', receiverPubkey]],
    created_at: Math.floor(Date.now() / 1000)
  };

  // Note: NIP-59 Gift Wraps don't strictly need a signature but need an ID.
  // Nostrify NRelay.publish usually expects a full NostrEvent.
  // We'll calculate the ID.
  const { getEventHash } = await import('nostr-tools');
  giftWrap.id = getEventHash(giftWrap);

  return giftWrap;
}
