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

  it('should throw error when no signer is available', async () => {
    const { createSigner } = await import('../nostrify-signer');
    
    // Ensure window.nostr is undefined
    const originalWindow = global.window;
    (global as any).window = undefined;
    
    expect(() => createSigner({})).toThrow('No signer available. Provide a private key or use a NIP-07 extension.');
    
    (global as any).window = originalWindow;
  });

  it('should create a Nip07Signer when no private key is provided', async () => {
    const { createSigner } = await import('../nostrify-signer');
    
    // Mock global.window.nostr
    (global as any).window = {
      nostr: {
        getPublicKey: vi.fn().mockResolvedValue('abc'),
        signEvent: vi.fn(),
      }
    };

    const signer = createSigner({});
    expect(signer).toBeDefined();
    
    // Cleanup
    (global as any).window = undefined;
  });
});
