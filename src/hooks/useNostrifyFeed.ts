import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { type NostrFilter } from "@nostrify/types";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { createRelayPool } from "@/lib/nostrify-relay";
import { getStorage } from "@/lib/nostrify-storage";
import { DEFAULT_RELAYS } from "@/lib/ndk";

export interface UseNostrifyFeedOptions {
  authors?: string[];
  kinds?: number[];
  relays?: string[];
  limit?: number;
}

/**
 * Hook to manage a stream of Nostr events using Nostrify.
 * Fetches events from relays and storage, and provides a real-time feed.
 */
export function useNostrifyFeed(options: UseNostrifyFeedOptions = {}) {
  const { ndk } = useNDK();
  const { authors, kinds = [1], relays = DEFAULT_RELAYS, limit = 50 } = options;
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const poolRef = useRef<ReturnType<typeof createRelayPool> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const authorsKey = useMemo(() => JSON.stringify(authors), [authors]);
  const kindsKey = useMemo(() => JSON.stringify(kinds), [kinds]);
  const relaysKey = useMemo(() => JSON.stringify(relays), [relays]);

  const fetchFeed = useCallback(async () => {
    if (!ndk) return;
    setLoading(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // 1. Fetch from Storage first
      const storage = await getStorage();
      const cachedEvents = await storage.query([{ authors, kinds, limit }]);
      const ndkCachedEvents = cachedEvents.map(e => new NDKEvent(ndk, e));
      setPosts(ndkCachedEvents);

      // 2. Initialize Pool and Subscribe to Relays
      if (!poolRef.current) {
        poolRef.current = createRelayPool(relays);
      }

      const filters: NostrFilter[] = [{ authors, kinds, limit }];
      
      const stream = poolRef.current.req(filters, { signal });

      for await (const msg of stream) {
        if (signal.aborted) break;

        if (msg[0] === 'EVENT') {
          const event = msg[2];
          setPosts((prev) => {
            if (prev.some(p => p.id === event.id)) return prev;
            const newPost = new NDKEvent(ndk, event);
            const combined = [newPost, ...prev];
            return combined
              .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
              .slice(0, 100);
          });
          storage.event(event).catch(() => {});
        } else if (msg[0] === 'EOSE') {
          setLoading(false);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Failed to fetch feed:', error);
      setLoading(false);
    }
  }, [ndk, authorsKey, kindsKey, relaysKey, limit, authors, kinds, relays]);

  useEffect(() => {
    if (ndk) {
      fetchFeed();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [ndk, fetchFeed]);

  return {
    posts,
    loading,
    refresh: fetchFeed,
  };
}
