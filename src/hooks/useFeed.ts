import { useEffect, useState, useRef, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useLists } from "@/hooks/useLists";

const MAX_POSTS = 100;

/**
 * Filtering types for the feed, mostly used for profile tabs.
 */
export type FeedFilterType = "all" | "posts" | "replies" | "media";

/**
 * Robust hook to manage and provide a stream of Nostr events.
 * Handles initial loading, pagination (load more), and real-time updates.
 * 
 * @param authors List of pubkeys to include in the feed (empty for global).
 * @param kinds List of event kinds to fetch (default: [1]).
 * @param filterType Client-side filter to apply (used for profile sub-feeds).
 */
export function useFeed(authors: string[], kinds: number[] = [1], filterType: FeedFilterType = "all") {
  const { ndk, isReady } = useNDK();
  const { mutedPubkeys } = useLists();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const realtimeSubRef = useRef<NDKSubscription | null>(null);
  const oldestTimestampRef = useRef<number | undefined>(undefined);
  
  // Use a ref for mutedPubkeys to avoid re-triggering fetchFeed when they change
  const mutedRef = useRef(mutedPubkeys);
  useEffect(() => {
    mutedRef.current = mutedPubkeys;
  }, [mutedPubkeys]);

  const cleanupSubscriptions = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.stop();
      subscriptionRef.current = null;
    }
    if (realtimeSubRef.current) {
      realtimeSubRef.current.stop();
      realtimeSubRef.current = null;
    }
  }, []);

  const matchesFilter = useCallback((event: NDKEvent) => {
    if (filterType === "all") return true;
    
    if (event.kind === 1 || event.kind === 30023) {
      const hasETags = event.tags.some(t => t[0] === 'e');
      if (filterType === "posts") return !hasETags;
      if (filterType === "replies") return hasETags;
      if (filterType === "media") {
        const hasMediaUrl = event.content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mov|mp4|webm)/i);
        const hasImeta = event.tags.some(t => t[0] === 'imeta');
        const hasImageTag = event.tags.some(t => t[0] === 'image');
        return !!(hasMediaUrl || hasImeta || hasImageTag);
      }
    }
    
    return true;
  }, [filterType]);

  const fetchFeed = useCallback(async (isLoadMore = false) => {
    if (!ndk || !isReady) {
      setLoading(false);
      return;
    }

    if (!isLoadMore) {
      setPosts([]);
      setHasMore(true);
      oldestTimestampRef.current = undefined;
    }

    setLoading(true);
    const fetchLimit = filterType === "all" ? 20 : 50;

    const filter: NDKFilter = {
      kinds: kinds,
      limit: fetchLimit,
    };

    if (authors.length > 0) {
      filter.authors = authors;
    }

    if (isLoadMore && oldestTimestampRef.current) {
      filter.until = oldestTimestampRef.current - 1;
    }

    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    let eventsReceived = 0;
    const batch: NDKEvent[] = [];

    const sub = ndk.subscribe(filter, { closeOnEose: true });
    subscriptionRef.current = sub;

    sub.on("event", (event: NDKEvent) => {
      clearTimeout(loadingTimeout);
      if (mutedRef.current.has(event.pubkey)) return;
      if (!kinds.includes(event.kind!)) return;

      eventsReceived++;
      if (matchesFilter(event)) {
        batch.push(event);
      }
    });

    sub.on("eose", () => {
      clearTimeout(loadingTimeout);
      
      setPosts((prev) => {
        const combined = isLoadMore ? [...prev, ...batch] : batch;
        const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
        const sorted = unique.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
        
        if (sorted.length > 0) {
          oldestTimestampRef.current = sorted[sorted.length - 1].created_at;
        }
        
        return sorted.slice(0, MAX_POSTS);
      });

      if (eventsReceived < fetchLimit) {
        setHasMore(false);
      }
      setLoading(false);
    });
  }, [ndk, isReady, authors, kinds, filterType, matchesFilter]);

  // Real-time listener
  useEffect(() => {
    if (!ndk || !isReady || loading) return;

    const realtimeFilter: NDKFilter = {
      kinds: kinds,
      since: Math.floor(Date.now() / 1000),
    };

    if (authors.length > 0) {
      realtimeFilter.authors = authors;
    }

    const sub = ndk.subscribe(realtimeFilter, { closeOnEose: false });
    realtimeSubRef.current = sub;

    sub.on("event", (event: NDKEvent) => {
      if (mutedRef.current.has(event.pubkey)) return;
      if (!matchesFilter(event)) return;
      
      setPosts((prev) => {
        if (prev.find(p => p.id === event.id)) return prev;
        const next = [event, ...prev].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
        return next.slice(0, MAX_POSTS);
      });
    });

    return () => {
      if (realtimeSubRef.current) realtimeSubRef.current.stop();
    };
  }, [ndk, isReady, authors, kinds, filterType, matchesFilter, loading]);

  useEffect(() => {
    fetchFeed();
    return () => cleanupSubscriptions();
  }, [fetchFeed, cleanupSubscriptions]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchFeed(true);
    }
  };

  return { posts, loading, loadMore, hasMore };
}
