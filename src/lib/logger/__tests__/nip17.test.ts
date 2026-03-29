import { describe, it, expect } from 'vitest';
import { createRumor, wrapSeal, wrapGift } from '../nip17';
import { NSecSigner } from '@nostrify/nostrify';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

describe('NIP-17 Composition', () => {
  const senderPrivkey = generateSecretKey();
  const senderPubkey = getPublicKey(senderPrivkey);
  const senderSigner = new NSecSigner(senderPrivkey);

  const receiverPrivkey = generateSecretKey();
  const receiverPubkey = getPublicKey(receiverPrivkey);

  it('should create a valid rumor', () => {
    const content = 'Test error message';
    const metadata = { env: 'test', stack: 'none', timestamp: '2026-03-29T10:00:00Z' };
    
    const rumor = createRumor(senderPubkey, content, metadata);
    
    expect(rumor.kind).toBe(14);
    expect(rumor.pubkey).toBe(senderPubkey);
    expect(rumor.content).toBe(content);
    expect(rumor.tags).toContainEqual(['env', 'test']);
    expect(rumor.tags).toContainEqual(['stack', 'none']);
    expect(rumor.tags).toContainEqual(['timestamp', '2026-03-29T10:00:00Z']);
  });

  it('should wrap a rumor into a seal', async () => {
    const rumor = createRumor(senderPubkey, 'Error', {});
    const seal = await wrapSeal(senderSigner, receiverPubkey, rumor);
    
    expect(seal.kind).toBe(13);
    expect(seal.pubkey).toBe(senderPubkey);
    // Seal content should be NIP-44 encrypted rumor JSON
    expect(seal.content).not.toBe(JSON.stringify(rumor));
  });

  it('should wrap a seal into a gift wrap', async () => {
    const rumor = createRumor(senderPubkey, 'Error', {});
    const seal = await wrapSeal(senderSigner, receiverPubkey, rumor);
    const giftWrap = await wrapGift(receiverPubkey, seal);
    
    expect(giftWrap.kind).toBe(1059);
    expect(giftWrap.tags).toContainEqual(['p', receiverPubkey]);
    // Gift wrap content should be NIP-44 encrypted seal JSON
    expect(giftWrap.content).not.toBe(JSON.stringify(seal));
  });

  it('should be decryptable by the receiver', async () => {
    const rumor = createRumor(senderPubkey, 'Test message', { foo: 'bar' });
    const seal = await wrapSeal(senderSigner, receiverPubkey, rumor);
    const giftWrap = await wrapGift(receiverPubkey, seal);

    const { nip44 } = await import('nostr-tools');

    // 1. Receiver decrypts Gift Wrap to get Seal
    const conversationKey1 = nip44.getConversationKey(receiverPrivkey, giftWrap.pubkey);
    const decryptedSealJson = nip44.decrypt(giftWrap.content, conversationKey1);
    const decryptedSeal = JSON.parse(decryptedSealJson);
    expect(decryptedSeal.kind).toBe(13);
    expect(decryptedSeal.pubkey).toBe(senderPubkey);

    // 2. Receiver decrypts Seal to get Rumor
    const receiverSigner = new NSecSigner(receiverPrivkey);
    const decryptedRumorJson = await receiverSigner.nip44.decrypt(senderPubkey, decryptedSeal.content);
    const decryptedRumor = JSON.parse(decryptedRumorJson);
    
    expect(decryptedRumor.kind).toBe(14);
    expect(decryptedRumor.content).toBe('Test message');
    expect(decryptedRumor.tags).toContainEqual(['foo', 'bar']);
  });
});
