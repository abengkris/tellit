import { BlossomUploader } from '@nostrify/nostrify';
import { NDKSigner } from '@nostrify/ndk';
import NDK from '@nostr-dev-kit/ndk';

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
  
  const signer = new NDKSigner(ndk.signer);
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
