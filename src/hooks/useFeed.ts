import { useEffect, useState, useRef, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKSubscription, NDKKind, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useLists } from "@/hooks/useLists";
import { tokenize } from "@/lib/content/tokenizer";

const MAX_POSTS = 100;

/**
 * Filtering types for the feed, mostly used for profile tabs.
 */
export type FeedFilterType = "all" | "posts" | "replies" | "media";

/**
 * Robust hook to manage and provide a stream of Nostr events.
 * Handles initial loading, pagination (load more), and real-time updates.
 */
export function useFeed(authors: string[], kinds: number[] = [1, 20, 1063, 1068, 30023] as NDKKind[], filterType: FeedFilterType = "all") {
  const { ndk, isReady, sync } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const realtimeSubRef = useRef<NDKSubscription | null>(null);
  const oldestTimestampRef = useRef<number | undefined>(undefined);
  const lastAuthorsRef = useRef<string[]>([]);
  
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
      const hasETags = event.tags.some(t => t[0] === 'e');
      if (filterType === "posts") return !hasETags;
      if (filterType === "replies") return hasETags;
    }

    if (event.kind === 6 || event.kind === 16) {
      return filterType === "posts";
    }
    
    return true;
  }, [filterType]);

  const fetchFeed = useCallback(async (isLoadMore = false) => {
    if (!ndk || !isReady) {
      setLoading(false);
      return;
    }

    const authorsChanged = JSON.stringify(authors) !== JSON.stringify(lastAuthorsRef.current);
    
    if (!isLoadMore || authorsChanged) {
      if (subscriptionRef.current) subscriptionRef.current.stop();
      setPosts([]);
      setHasMore(true);
      oldestTimestampRef.current = undefined;
      lastAuthorsRef.current = authors;
    }

    setLoading(true);
    const fetchLimit = filterType === "all" ? 20 : 50;

    // Clean filters to prevent NDK validation errors
    const validAuthors = authors.filter(a => !!a && /^[0-9a-fA-F]{64}$/.test(a));
    const validKinds = kinds.filter(k => typeof k === 'number' && !isNaN(k));

    const filter: NDKFilter = {
      kinds: validKinds,
      limit: fetchLimit,
    };

    if (validAuthors.length > 0) {
      filter.authors = validAuthors;
    }

    if (isLoadMore && oldestTimestampRef.current) {
      filter.until = oldestTimestampRef.current - 1;
    }

    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    let eventsReceived = 0;

    const options = { 
      closeOnEose: true, 
      groupable: true,
      cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      relayGoalPerAuthor: validAuthors.length > 50 ? 2 : 3, // Adjust redundancy based on list size
    };

    const handlers = {
      onEvents: (events: NDKEvent[]) => {
        eventsReceived += events.length;
        if (isLoadMore) return; // onEvents is primarily for initial cache load
        
        const filtered = events
          .filter(e => matchesFilter(e))
          .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
        
        if (filtered.length > 0) {
          setPosts(filtered.slice(0, MAX_POSTS));
          oldestTimestampRef.current = filtered[filtered.length - 1].created_at;
        }
      },
      onEvent: (event: NDKEvent) => {
        clearTimeout(loadingTimeout);
        eventsReceived++;
        
        if (!matchesFilter(event)) return;

        setPosts((prev) => {
          if (prev.find(p => p.id === event.id)) return prev;
          const combined = [...prev, event];
          const sorted = combined.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
          
          if (sorted.length > 0) {
            oldestTimestampRef.current = sorted[sorted.length - 1].created_at;
          }
          
          return sorted.slice(0, MAX_POSTS);
        });
      },
      onEose: () => {
        clearTimeout(loadingTimeout);
        if (eventsReceived < fetchLimit) {
          setHasMore(false);
        }
        setLoading(false);
      }
    };

    const syncOptions = { 
      ...options,
      ...handlers
    };

    if (sync && !isLoadMore) {
      sync.syncAndSubscribe(filter, syncOptions).then(sub => {
        subscriptionRef.current = sub;
      }).catch(() => {
        subscriptionRef.current = ndk.subscribe(filter, options, handlers);
      });
    } else {
      subscriptionRef.current = ndk.subscribe(filter, options, handlers);
    }
  }, [ndk, isReady, sync, authors, kinds, filterType, matchesFilter]);

  // Real-time listener: starts immediately, independent of loading history
  useEffect(() => {
    if (!ndk || !isReady) return;

    if (realtimeSubRef.current) realtimeSubRef.current.stop();

    // Clean filters for real-time listener
    const validAuthors = authors.filter(a => !!a && /^[0-9a-fA-F]{64}$/.test(a));
    const validKinds = kinds.filter(k => typeof k === 'number' && !isNaN(k));

    const realtimeFilter: NDKFilter = {
      kinds: validKinds,
      since: Math.floor(Date.now() / 1000),
    };

    if (validAuthors.length > 0) {
      realtimeFilter.authors = validAuthors;
    }

    const sub = ndk.subscribe(
      realtimeFilter, 
      { 
        closeOnEose: false,
        groupable: true,
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY // Only listen for NEW events from relays
      },
      {
        onEvent: (event: NDKEvent) => {
          if (!matchesFilter(event)) return;
          
          setPosts((prev) => {
            if (prev.find(p => p.id === event.id)) return prev;
            const next = [event, ...prev].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
            return next.slice(0, MAX_POSTS);
          });
        }
      }
    );
    realtimeSubRef.current = sub;

    return () => {
      if (realtimeSubRef.current) realtimeSubRef.current.stop();
    };
  }, [ndk, isReady, authors, kinds, filterType, matchesFilter]);

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
