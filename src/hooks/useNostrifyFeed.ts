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
  const [hasMore, setHasMore] = useState(true);
  const poolRef = useRef<ReturnType<typeof createRelayPool> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const oldestTimestampRef = useRef<number | undefined>(undefined);

  const authorsKey = useMemo(() => JSON.stringify(authors), [authors]);
  const kindsKey = useMemo(() => JSON.stringify(kinds), [kinds]);
  const relaysKey = useMemo(() => JSON.stringify(relays), [relays]);

  const fetchFeed = useCallback(async (until?: number) => {
    if (!ndk) return;
    if (!until) {
      setLoading(true);
    }
    
    if (abortControllerRef.current && !until) {
      abortControllerRef.current.abort();
    }
    
    if (!until) {
      abortControllerRef.current = new AbortController();
    }
    
    const signal = abortControllerRef.current?.signal;

    try {
      // 1. Fetch from Storage first
      const storage = await getStorage();
      const filters: NostrFilter[] = [{ authors, kinds, limit, until }];
      
      if (storage) {
        const cachedEvents = await storage.query(filters);
        
        if (cachedEvents.length > 0) {
          const ndkCachedEvents = cachedEvents.map(e => new NDKEvent(ndk, e));
          setPosts((prev) => {
            if (!until) return ndkCachedEvents;
            const combined = [...prev, ...ndkCachedEvents];
            const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
            return unique.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)).slice(0, 500);
          });
          
          const last = cachedEvents[cachedEvents.length - 1];
          if (typeof last.created_at === 'number') {
            oldestTimestampRef.current = last.created_at;
          }
        }

        if (cachedEvents.length < limit && cachedEvents.length > 0) {
          setHasMore(false);
        }
      }

      // 2. Initialize Pool and Subscribe to Relays
      if (!poolRef.current) {
        poolRef.current = createRelayPool(relays);
      }

      // We use pool.req to stream events
      const stream = poolRef.current.req(filters, { signal });

      for await (const msg of stream) {
        if (signal?.aborted) break;

        if (msg[0] === 'EVENT') {
          const event = msg[2];
          setPosts((prev) => {
            if (prev.some(p => p.id === event.id)) return prev;
            const newPost = new NDKEvent(ndk, event);
            const combined = [newPost, ...prev];
            const sorted = combined
              .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
              .slice(0, 500);
            
            if (sorted.length > 0) {
              const last = sorted[sorted.length - 1];
              if (typeof last.created_at === 'number') {
                oldestTimestampRef.current = last.created_at;
              }
            }
            return sorted;
          });
          if (storage) {
            storage.event(event).catch(() => {});
          }
        } else if (msg[0] === 'EOSE') {
          if (!until) {
            setLoading(false);
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Failed to fetch feed:', error);
      setLoading(false);
    }
  }, [ndk, authorsKey, kindsKey, relaysKey, limit, authors, kinds, relays]);

  const loadMore = useCallback(() => {
    if (oldestTimestampRef.current) {
      fetchFeed(oldestTimestampRef.current - 1);
    }
  }, [fetchFeed]);

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
    hasMore,
    loadMore,
    refresh: () => fetchFeed(),
  };
}
