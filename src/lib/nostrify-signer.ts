import { NSecSigner, NBrowserSigner, NostrSigner } from '@nostrify/nostrify';

export interface CreateSignerOptions {
  privateKey?: string;
}

/**
 * Converts a hex string to a Uint8Array.
 * Avoids using Node.js Buffer in the browser.
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Factory to create a Nostrify signer based on available credentials.
 * If a private key is provided, it uses NSecSigner.
 * Otherwise, it falls back to NBrowserSigner (browser extension).
 */
export function createSigner(options: CreateSignerOptions = {}): NostrSigner {
  if (options.privateKey) {
    return new NSecSigner(hexToBytes(options.privateKey));
  }

  if (typeof window !== 'undefined' && window.nostr) {
    return new NBrowserSigner();
  }

  throw new Error('No signer available. Provide a private key or use a NIP-07 extension.');
}
