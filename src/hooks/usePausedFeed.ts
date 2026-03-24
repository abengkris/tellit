"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKSubscription, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { validateEvent } from "@/lib/policies";

interface UsePausedFeedOptions {
  filter: NDKFilter;
  bufferDelay?: number;
  maxBuffer?: number;
  maxVisible?: number;
}

interface UsePausedFeedReturn {
  posts: NDKEvent[];            
  newCount: number;             
  isLoading: boolean;
  flushNewPosts: () => void;    
  loadMore: () => void;         
  hasMore: boolean;
}

export function usePausedFeed({
  filter,
  bufferDelay = 1500,
  maxBuffer = 50,
  maxVisible = 100,
}: UsePausedFeedOptions): UsePausedFeedReturn {
  const { ndk, isReady } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | undefined>();

  const bufferRef = useRef<NDKEvent[]>([]);
  const isInitialLoadDone = useRef(false);
  const bufferDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const subRef = useRef<NDKSubscription | null>(null);
  const prevFilterRef = useRef<string>("");

  const filterStr = JSON.stringify(filter);

  useEffect(() => {
    if (!ndk || !isReady) return;

    const filterChanged = filterStr !== prevFilterRef.current;
    
    if (filterChanged) {
      isInitialLoadDone.current = false;
      Promise.resolve().then(() => {
        setIsLoading(true);
        setNewCount(0);
        setPosts([]);
      });
      bufferRef.current = [];
      seenIds.current = new Set();
      prevFilterRef.current = filterStr;
    } else if (posts.length > 0) {
      // If filter didn't change and we have posts, don't show loading
      Promise.resolve().then(() => setIsLoading(false));
      return;
    }

    const sub = ndk.subscribe(
      { ...filter, limit: 20 },
      { 
        closeOnEose: false,
        groupable: true,
        groupableDelay: 250,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL 
      },
      {
        onEvents: async (events: NDKEvent[]) => {
          // Process initial batch from cache
          const validEvents: NDKEvent[] = [];
          for (const event of events) {
            if (seenIds.current.has(event.id)) continue;
            const ok = await validateEvent(event);
            if (!ok) continue;
            seenIds.current.add(event.id);
            validEvents.push(event);
          }

          if (validEvents.length > 0) {
            setPosts(prev => {
              const next = [...prev, ...validEvents].sort(
                (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
              );
              return next.slice(0, maxVisible);
            });
          }
        },
        onEvent: async (event: NDKEvent) => {
          if (seenIds.current.has(event.id)) return;
          
          // Perform automated spam check using NPolicy
          const ok = await validateEvent(event);
          if (!ok) return;

          seenIds.current.add(event.id);

          if (!isInitialLoadDone.current) {
            setPosts(prev => {
              const next = [...prev, event].sort(
                (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
              );
              return next.slice(0, maxVisible);
            });
          } else {
            bufferRef.current = [event, ...bufferRef.current]
              .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
              .slice(0, maxBuffer);
            setNewCount(bufferRef.current.length);
          }
        },
        onEose: () => {
          Promise.resolve().then(() => setIsLoading(false));
          if (bufferDelayTimer.current) clearTimeout(bufferDelayTimer.current);
          bufferDelayTimer.current = setTimeout(() => {
            isInitialLoadDone.current = true;
          }, bufferDelay);
        }
      }
    );
    subRef.current = sub;

    return () => {
      sub.stop();
      subRef.current = null;
      if (bufferDelayTimer.current) clearTimeout(bufferDelayTimer.current);
    };
  }, [ndk, isReady, filterStr, bufferDelay, maxBuffer, maxVisible, filter]);

  useEffect(() => {
    if (posts.length > 0) {
      const oldest = posts[posts.length - 1].created_at;
      Promise.resolve().then(() => setOldestTimestamp(oldest));
    }
  }, [posts, posts.length]);

  const flushNewPosts = useCallback(() => {
    if (bufferRef.current.length === 0) return;

    setPosts(prev => {
      const combined = [...bufferRef.current, ...prev];
      const unique = Array.from(
        new Map(combined.map(e => [e.id, e])).values()
      ).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      return unique.slice(0, maxVisible);
    });

    bufferRef.current = [];
    setNewCount(0);
  }, [maxVisible]);

  const loadMore = useCallback(async () => {
    if (!ndk || !oldestTimestamp || !hasMore) return;

    const olderPosts = await ndk.fetchEvents({
      ...filter,
      until: oldestTimestamp - 1,
      limit: 20,
    });

    const sorted = Array.from(olderPosts).sort(
      (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
    );

    if (sorted.length < 20) setHasMore(false);

    setPosts(prev => {
      const combined = [...prev, ...sorted];
      const unique = Array.from(
        new Map(combined.map(e => [e.id, e])).values()
      ).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      return unique.slice(0, maxVisible + 50); // allow slightly more for scrolling
    });
  }, [ndk, oldestTimestamp, hasMore, filter, maxVisible]);

  return { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore };
}
