"use client";

import { useMemo, useCallback } from "react";
import NDKBlossom from "@nostr-dev-kit/ndk-blossom";
import { useNDK } from "./useNDK";
import { defaultSHA256Calculator } from "@nostr-dev-kit/ndk-blossom";

const DEFAULT_BLOSSOM_SERVERS = [
  "https://blossom.primal.net",
  "https://cdn.nostr.build",
  "https://nos.lol",
];

export function useBlossom() {
  const { ndk } = useNDK();

  const blossom = useMemo(() => {
    if (!ndk) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = new NDKBlossom(ndk as any);
    instance.setSHA256Calculator(defaultSHA256Calculator);
    return instance;
  }, [ndk]);

  const uploadFile = useCallback(
    async (file: File, onProgress?: (progress: { loaded: number; total: number }) => void) => {
      if (!blossom) throw new Error("Blossom not initialized");

      // We'll try to use the user's blossom list if available, or fall back to defaults
      const result = await blossom.upload(file, {
        onProgress: (progress) => {
          onProgress?.(progress);
          return "continue";
        },
        fallbackServer: DEFAULT_BLOSSOM_SERVERS[0],
      });

      return result;
    },
    [blossom]
  );

  const fixUrl = useCallback(
    async (pubkey: string, url: string) => {
      if (!blossom || !ndk) return url;
      try {
        const user = ndk.getUser({ pubkey });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const correctUrl = await blossom.fixUrl(user as any, url);
        return correctUrl || url;
      } catch (_) {
        return url;
      }
    },
    [blossom, ndk]
  );

  const listBlobs = useCallback(
    async (pubkey: string) => {
      if (!blossom || !ndk) return [];
      try {
        const user = ndk.getUser({ pubkey });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await blossom.listBlobs(user as any);
      } catch (_) {
        return [];
      }
    },
    [blossom, ndk]
  );

  const getOptimizedUrl = useCallback(
    async (url: string, options: { width?: number; height?: number; format?: string; quality?: number }) => {
      if (!blossom || !url) return url;
      
      try {
        // Optimization: Only attempt to optimize if it's a known blossom server or matches pattern
        // BUD-05 optimization is specific to Blossom servers. 
        // Applying it to generic URLs (like S3 or legacy CDNs) will likely break them.
        const isBlossom = url.includes('blossom') || 
                         url.includes('cdn.nostr.build') || 
                         url.includes('nos.lol') ||
                         url.includes('/media/');

        if (!isBlossom) return url;

        // NDK-Blossom provides an optimized URL generator based on BUD-05
        return await blossom.getOptimizedUrl(url, options);
      } catch (_) {
        return url;
      }
    },
    [blossom]
  );

  return { blossom, uploadFile, fixUrl, listBlobs, getOptimizedUrl };
}
