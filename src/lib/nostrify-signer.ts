import { NSecSigner, NBrowserSigner, NostrSigner } from '@nostrify/nostrify';

export interface CreateSignerOptions {
  privateKey?: string;
}

/**
 * Factory to create a Nostrify signer based on available credentials.
 * If a private key is provided, it uses NSecSigner.
 * Otherwise, it falls back to NBrowserSigner (browser extension).
 */
export function createSigner(options: CreateSignerOptions = {}): NostrSigner {
  if (options.privateKey) {
    return new NSecSigner(options.privateKey);
  }

  if (typeof window !== 'undefined' && window.nostr) {
    return new NBrowserSigner();
  }

  throw new Error('No signer available. Provide a private key or use a NIP-07 extension.');
}
