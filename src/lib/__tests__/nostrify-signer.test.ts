/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

describe('Nostrify Signer Factory', () => {
  it('should create a PrivateKeySigner from a hex private key', async () => {
    const { createSigner } = await import('../nostrify-signer');
    const secretKey = generateSecretKey();
    const secretKeyHex = Buffer.from(secretKey).toString('hex');
    const pubkey = getPublicKey(secretKey);

    const signer = createSigner({ privateKey: secretKeyHex });
    expect(await signer.getPublicKey()).toBe(pubkey);
  });

  it('should create a Nip07Signer when no private key is provided', async () => {
    const { createSigner } = await import('../nostrify-signer');
    
    // Mock globalThis.nostr
    const mockPubkey = 'abc';
    (globalThis as any).nostr = {
      getPublicKey: vi.fn().mockResolvedValue(mockPubkey),
      signEvent: vi.fn(),
    };

    const signer = createSigner({});
    expect(await signer.getPublicKey()).toBe(mockPubkey);
    
    // Cleanup
    delete (globalThis as any).nostr;
  });
});
