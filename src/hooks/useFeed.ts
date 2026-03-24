import { useEffect, useState, useRef, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKSubscription, NDKKind, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
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
export function useFeed(authors: string[], kinds: number[] = [1, 20, 1063, 1068, 1111, 30023] as NDKKind[], filterType: FeedFilterType = "all") {
  const { ndk, isReady, sync } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  const updateBufferRef = useRef<NDKEvent[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const realtimeSubRef = useRef<NDKSubscription | null>(null);
  const oldestTimestampRef = useRef<number | undefined>(undefined);
  const lastAuthorsRef = useRef<string[]>([]);

  const processUpdateBuffer = useCallback(() => {
    if (updateBufferRef.current.length === 0) return;

    const newEvents = [...updateBufferRef.current];
    updateBufferRef.current = [];
    updateTimeoutRef.current = null;

    setPosts((prev) => {
      const uniqueMap = new Map();
      // Add existing posts
      prev.filter(p => p && p.id).forEach(p => uniqueMap.set(p.id, p));
      // Add new ones
      newEvents.filter(e => e && e.id).forEach(e => uniqueMap.set(e.id, e));
      
      const combined = Array.from(uniqueMap.values());
      const sorted = combined.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      
      if (sorted.length > 0) {
        oldestTimestampRef.current = sorted[sorted.length - 1].created_at;
      }
      
      return sorted.slice(0, MAX_POSTS);
    });
  }, []);

  const queueUpdate = useCallback((events: NDKEvent[]) => {
    updateBufferRef.current.push(...events);
    if (!updateTimeoutRef.current) {
      updateTimeoutRef.current = setTimeout(processUpdateBuffer, 100);
    }
  }, [processUpdateBuffer]);
  
  const cleanupSubscriptions = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.stop();
      subscriptionRef.current = null;
    }
    if (realtimeSubRef.current) {
      realtimeSubRef.current.stop();
      realtimeSubRef.current = null;
    }
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
  }, []);

  const matchesFilter = useCallback((event: NDKEvent) => {
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
      groupableDelay: 250,
      cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      relayGoalPerAuthor: validAuthors.length > 50 ? 2 : 3, // Adjust redundancy based on list size
    };

    const handlers = {
      onEvents: async (events: NDKEvent[]) => {
        eventsReceived += events.length;
        if (isLoadMore) return; // onEvents is primarily for initial cache load
        
        // Parallelize validation for initial batch from cache
        const validationResults = await Promise.all(
          events.map(async (event) => {
            const ok = await matchesFilter(event);
            if (!ok) return null;
            return event;
          })
        );

        const filtered = validationResults.filter((e): e is NDKEvent => e !== null);
        
        if (filtered.length > 0) {
          queueUpdate(filtered);
        }
        
        // After receiving initial batch from cache, we can determine a 'since' timestamp
        // for more efficient sync reconciliation if needed.
        if (events.length > 0 && !isLoadMore && sync) {
          const latestCached = Math.max(...events.map(e => e.created_at || 0));
          if (latestCached > 0) {
            // We can optionally refine the sync filter here if NDKSync supports it
            // but syncAndSubscribe usually handles this internally if the filter has a 'since'
          }
        }
      },
      onEvent: (event: NDKEvent) => {
        clearTimeout(loadingTimeout);
        eventsReceived++;
        
        if (!matchesFilter(event)) return;
        queueUpdate([event]);
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
      // Determine the 'since' parameter from existing posts if we have them, 
      // otherwise trust the cache provider's behavior or use a sensible default (e.g. 24h)
      const lastSessionTimestamp = posts.length > 0 ? posts[0].created_at : undefined;
      
      const syncFilter = { ...filter };
      if (lastSessionTimestamp) {
        syncFilter.since = lastSessionTimestamp;
      }

      sync.syncAndSubscribe(syncFilter, syncOptions).then(sub => {
        subscriptionRef.current = sub;
      }).catch((err) => {
        console.warn("[useFeed] NDKSync failed, falling back to standard subscribe:", err);
        subscriptionRef.current = ndk.subscribe(filter, options, handlers);
      });
    } else {
      subscriptionRef.current = ndk.subscribe(filter, options, handlers);
    }
  }, [ndk, isReady, sync, authors, kinds, filterType, matchesFilter, posts, queueUpdate]);

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
        groupableDelay: 250,
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY // Only listen for NEW events from relays
      },
      {
        onEvent: (event: NDKEvent) => {
          if (!matchesFilter(event)) return;
          queueUpdate([event]);
        }
      }
    );
    realtimeSubRef.current = sub;

    return () => {
      if (realtimeSubRef.current) realtimeSubRef.current.stop();
    };
  }, [ndk, isReady, authors, kinds, filterType, matchesFilter, queueUpdate]);

  useEffect(() => {
    if (!ndk || !isReady) return;

    const handleLocalCacheSave = (event: NDKEvent) => {
      if (!matchesFilter(event)) return;
      if (event.kind !== undefined && !kinds.includes(event.kind as number)) return;
      if (authors.length > 0 && !authors.includes(event.pubkey)) return;

      queueUpdate([event]);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ndk as any).on("local-cache:save", handleLocalCacheSave);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ndk as any).off("local-cache:save", handleLocalCacheSave);
    };
  }, [ndk, isReady, authors, kinds, matchesFilter, queueUpdate]);

  useEffect(() => {
    fetchFeed();
    return () => cleanupSubscriptions();
  }, [fetchFeed, cleanupSubscriptions]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchFeed(true);
    }
  }, [loading, hasMore, fetchFeed]);

  return { posts, loading, loadMore, hasMore };
}
