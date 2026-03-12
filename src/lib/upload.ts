import { BlossomUploader } from '@nostrify/nostrify/uploaders';
import { NostrEvent, NostrSigner } from '@nostrify/types';
import NDK from '@nostr-dev-kit/ndk';

/**
 * Bridge NDK Signer to Nostrify NostrSigner.
 */
class NDKSignerBridge implements NostrSigner {
  constructor(private ndk: NDK) {}

  async getPublicKey(): Promise<string> {
    const user = await this.ndk.signer?.user();
    if (!user) throw new Error("No user available");
    return user.pubkey;
  }

  async signEvent(event: NostrEvent): Promise<NostrEvent> {
    if (!this.ndk.signer) throw new Error("No signer available");
    
    // Convert Nostrify event to NDK event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ndkEvent = new (await import('@nostr-dev-kit/ndk')).NDKEvent(this.ndk, event as any);
    await ndkEvent.sign(this.ndk.signer);
    
    return ndkEvent.rawEvent() as NostrEvent;
  }
}

/**
 * Standardized uploader using Nostrify's BlossomUploader.
 * Returns NIP-94 tags (including url, x, m, size, dim, blurhash).
 */
export async function uploadToBlossom(
  ndk: NDK,
  file: File,
  servers: string[] = ["https://blossom.primal.net", "https://nos.lol"]
): Promise<string[][]> {
  if (!ndk.signer) throw new Error("NDK Signer not available");
  
  const signer = new NDKSignerBridge(ndk);
  const uploader = new BlossomUploader({
    servers,
    signer,
  });

  return uploader.upload(file);
}

/**
 * Helper to extract specific metadata from NIP-94 tags.
 */
export function getTagValue(tags: string[][], name: string): string | undefined {
  return tags.find(([t]) => t === name)?.[1];
}

/**
 * Formats tags into NIP-92 imeta format.
 */
export function formatImeta(tags: string[][]): string[] {
  return ["imeta", ...tags.map(tag => tag.join(" "))];
}
