import { useEffect, useState, useRef, useCallback } from "react";
import { type NostrFilter, type NostrEvent } from "@nostrify/types";
import { createRelayPool } from "@/lib/nostrify-relay";
import { getStorage } from "@/lib/nostrify-storage";
import { DEFAULT_RELAYS } from "@/lib/ndk";
import { tokenize } from "@/lib/content/tokenizer";

export type FeedFilterType = "all" | "posts" | "replies" | "media";

export interface UseNostrifyFeedOptions {
  authors?: string[];
  kinds?: number[];
  relays?: string[];
  limit?: number;
  filterType?: FeedFilterType;
}

const MAX_POSTS = 500;
const DEFAULT_KINDS = [1];

/**
 * Enhanced hook to manage a stream of Nostr events using Nostrify.
 * Supports complex filtering, paging, and real-time updates.
 */
export function useNostrifyFeed(options: UseNostrifyFeedOptions = {}) {
  const { 
    authors: authorsRaw, 
    kinds: kindsRaw = DEFAULT_KINDS, 
    relays: relaysRaw = DEFAULT_RELAYS, 
    limit = 50, 
    filterType = "all" 
  } = options;

  // Use refs to stabilize array/object dependencies
  const authorsRef = useRef(authorsRaw);
  const kindsRef = useRef(kindsRaw);
  const relaysRef = useRef(relaysRaw);

  if (JSON.stringify(authorsRef.current) !== JSON.stringify(authorsRaw)) {
    authorsRef.current = authorsRaw;
  }
  if (JSON.stringify(kindsRef.current) !== JSON.stringify(kindsRaw)) {
    kindsRef.current = kindsRaw;
  }
  if (JSON.stringify(relaysRef.current) !== JSON.stringify(relaysRaw)) {
    relaysRef.current = relaysRaw;
  }

  const authors = authorsRef.current;
  const kinds = kindsRef.current;
  const relays = relaysRef.current;

  const [posts, setPosts] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  const poolRef = useRef<ReturnType<typeof createRelayPool> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const oldestTimestampRef = useRef<number | undefined>(undefined);
  const updateBufferRef = useRef<NostrEvent[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const matchesFilter = useCallback((event: NostrEvent) => {
    if (!event || !event.id) return false;
    if (filterType === "all") return true;
    
    if (filterType === "media") {
      if (event.kind === 20 || event.kind === 1063) {
        return event.tags.some(t => t[0] === 'url');
      }
      if (event.kind === 30023) {
        return event.tags.some(t => t[0] === 'image');
      }
      if (event.kind === 1) {
        const tokens = tokenize(event.content);
        const hasMediaToken = tokens.some(t => t.type === 'image' || t.type === 'video');
        if (hasMediaToken) return true;
        const hasImeta = event.tags.some(t => t[0] === 'imeta');
        const hasImageTag = event.tags.some(t => t[0] === 'image');
        return hasImeta || hasImageTag;
      }
      return false;
    }

    if (event.kind === 1 || event.kind === 30023 || event.kind === 1068 || event.kind === 1111) {
      const hasETags = event.tags.some(t => t[0] === 'e' || t[0] === 'a');
      if (filterType === "posts") return !hasETags;
      if (filterType === "replies") return hasETags;
    }

    if (event.kind === 6 || event.kind === 16) {
      return filterType === "posts";
    }
    
    return true;
  }, [filterType]);

  const processUpdateBuffer = useCallback(() => {
    if (updateBufferRef.current.length === 0) return;

    const newEvents = [...updateBufferRef.current];
    updateBufferRef.current = [];
    updateTimeoutRef.current = null;

    setPosts((prev) => {
      const uniqueMap = new Map();
      prev.forEach(p => uniqueMap.set(p.id, p));
      newEvents.forEach(e => {
        if (matchesFilter(e)) {
          uniqueMap.set(e.id, e);
        }
      });
      
      const combined = Array.from(uniqueMap.values()) as NostrEvent[];
      const sorted = combined.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      
      if (sorted.length > 0) {
        oldestTimestampRef.current = sorted[sorted.length - 1].created_at;
      }
      
      return sorted.slice(0, MAX_POSTS);
    });
  }, [matchesFilter]);

  const queueUpdate = useCallback((event: NostrEvent) => {
    updateBufferRef.current.push(event);
    if (!updateTimeoutRef.current) {
      updateTimeoutRef.current = setTimeout(processUpdateBuffer, 100);
    }
  }, [processUpdateBuffer]);

  const fetchFeed = useCallback(async (until?: number) => {
    if (!until) {
      setLoading(true);
      setPosts([]);
      oldestTimestampRef.current = undefined;
    }
    
    if (abortControllerRef.current && !until) {
      abortControllerRef.current.abort();
    }
    
    if (!until) {
      abortControllerRef.current = new AbortController();
    }
    
    const signal = abortControllerRef.current?.signal;

    try {
      const storage = await getStorage();
      const filters: NostrFilter[] = [{ authors, kinds, limit, until }];
      
      if (storage) {
        const cachedEvents = await storage.query(filters);
        const filtered = cachedEvents.filter(matchesFilter);
        
        if (filtered.length > 0) {
          setPosts((prev) => {
            const combined = [...prev, ...filtered];
            const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
            return unique.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)).slice(0, MAX_POSTS);
          });
          
          const last = filtered[filtered.length - 1];
          if (typeof last.created_at === 'number') {
            oldestTimestampRef.current = last.created_at;
          }
        }

        if (filtered.length < limit && cachedEvents.length > 0) {
          // If we have fewer than limit after filtering, we might still have more in relay
        }
      }

      if (!poolRef.current) {
        poolRef.current = createRelayPool(relays);
      }

      const stream = poolRef.current.req(filters, { signal });

      let receivedCount = 0;
      for await (const msg of stream) {
        if (signal?.aborted) break;

        if (msg[0] === 'EVENT') {
          const event = msg[2];
          receivedCount++;
          queueUpdate(event);
          if (storage) {
            storage.event(event).catch(() => {});
          }
        } else if (msg[0] === 'EOSE') {
          if (!until) {
            setLoading(false);
          }
          if (receivedCount < limit) {
            setHasMore(false);
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('[useNostrifyFeed] Failed to fetch feed:', error);
      setLoading(false);
    }
  }, [limit, authors, kinds, relays, matchesFilter, queueUpdate]);

  const loadMore = useCallback(() => {
    if (oldestTimestampRef.current && !loading && hasMore) {
      fetchFeed(oldestTimestampRef.current - 1);
    }
  }, [fetchFeed, loading, hasMore]);

  useEffect(() => {
    fetchFeed();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [fetchFeed]);

  return {
    posts,
    loading,
    hasMore,
    loadMore,
    refresh: () => fetchFeed(),
  };
}
