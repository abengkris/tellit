"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NDKEvent, NDKKind, NDKSubscription, NDKFilter } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useWoTNetwork } from "./useWoTNetwork";
import { useUIStore } from "@/store/ui";
import { ScoredEvent } from "@/lib/feed/scorer";
import { validateEvent } from "@/lib/policies";


interface UseForYouFeedOptions {
  viewerPubkey: string;
  followingList: string[];
  interests: string[];
}

interface UseForYouFeedReturn {
  posts: NDKEvent[];
  newCount: number;
  isLoading: boolean;
  wotStatus: "idle" | "loading" | "ready" | "error";
  wotSize: number;            
  hasInterests: boolean;
  flushNewPosts: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useForYouFeed({
  viewerPubkey,
  followingList,
  interests,
}: UseForYouFeedOptions): UseForYouFeedReturn {
  const { ndk, isReady, sync } = useNDK();
  const { wotStrictMode } = useUIStore();
  
  // Use the new on-demand WoT Network
  // We'll pass the following list initially, and then extend it as we see more events
  const [discoverPubkeys, setDiscoverPubkeys] = useState<string[]>(followingList);
  const { network, loading: wotLoading } = useWoTNetwork(discoverPubkeys);

  const [rawEvents, setRawEvents] = useState<NDKEvent[]>([]);
  const [rankedPosts, setRankedPosts] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const hasInterests = interests.length > 0;

  const wotStatus = wotLoading ? "loading" : "ready";
  const wotSize = Object.keys(network).length;

  // Buffer for batching updates to rawEvents to avoid excessive re-renders
  const updateBufferRef = useRef<NDKEvent[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const bufferRef = useRef<NDKEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);
  const prevFollowingListRef = useRef<string>("");

  // Worker for background scoring
  const workerRef = useRef<Worker | null>(null);
  const scoringTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL("@/lib/feed/scorer.worker.ts", import.meta.url));
    
    workerRef.current.onmessage = (e: MessageEvent<ScoredEvent[]>) => {
      if (!ndk) return;
      const scoredEvents = e.data;
      const events = scoredEvents.map(se => {
        const event = new NDKEvent(ndk, se.event);
        return event;
      });
      setRankedPosts(events);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [ndk]);

  // Trigger worker-based scoring when inputs change
  useEffect(() => {
    if (!workerRef.current || !isReady || !ndk) return;

    if (scoringTimeoutRef.current) clearTimeout(scoringTimeoutRef.current);

    scoringTimeoutRef.current = setTimeout(() => {
      let baseEvents = rawEvents;
      
      // Strict Mode: Filter out anyone with 0 degree (unknown/spam)
      if (wotStrictMode) {
        baseEvents = rawEvents.filter(e => {
          const degree = network[e.pubkey];
          return followingList.includes(e.pubkey) || (degree && degree > 0);
        });
      }

      if (baseEvents.length === 0) {
        setRankedPosts([]);
        return;
      }

      // Prepare context for the worker (plain objects only)
      const context = {
        viewerPubkey,
        followingSet: Array.from(followingList),
        followsOfFollowsSet: [], // Legacy, we use networkDegreeMap now
        interactionHistory: Array.from(new Map().entries()), // To be implemented
        networkDegreeMap: network, // Use the new Redis-backed degree map
        interestsSet: Array.from(interests),
      };

      const plainEvents = baseEvents.map(e => e.rawEvent());

      workerRef.current?.postMessage({
        events: plainEvents,
        context,
      });
    }, 100); // 100ms debounce for scoring

    return () => {
      if (scoringTimeoutRef.current) clearTimeout(scoringTimeoutRef.current);
    };
  }, [rawEvents, wotStrictMode, followingList, viewerPubkey, network, interests, isReady, ndk]);

  const posts = rankedPosts;

  // Batch process new events into rawEvents state
  const processUpdateBuffer = useCallback(() => {
    if (updateBufferRef.current.length === 0) return;

    const newEvents = [...updateBufferRef.current];
    updateBufferRef.current = [];
    updateTimeoutRef.current = null;

    setRawEvents(prev => {
      const combined = [...prev, ...newEvents];
      // Faster way to deduplicate if list is already fairly large
      const uniqueMap = new Map();
      combined.filter(e => e && e.id).forEach(e => uniqueMap.set(e.id, e));
      return Array.from(uniqueMap.values());
    });
    
    // Auto-discover new pubkeys to check trust for
    const newPubkeys = newEvents.map(e => e.pubkey);
    setDiscoverPubkeys(prev => {
      const next = Array.from(new Set([...prev, ...newPubkeys])).slice(0, 1000);
      return next;
    });
  }, []);

  const queueUpdate = useCallback((events: NDKEvent[]) => {
    updateBufferRef.current.push(...events);
    if (!updateTimeoutRef.current) {
      updateTimeoutRef.current = setTimeout(processUpdateBuffer, 200);
    }
  }, [processUpdateBuffer]);

  useEffect(() => {
    if (!ndk || !isReady) return;

    const followingStr = JSON.stringify(followingList);
    const listChanged = followingStr !== prevFollowingListRef.current;

    if (listChanged) {
      Promise.resolve().then(() => {
        setIsLoading(true);
        setRawEvents([]);
      });
      seenIds.current = new Set();
      isInitialLoadDone.current = false;
      bufferRef.current = [];
      prevFollowingListRef.current = followingStr;
      setDiscoverPubkeys(followingList);
    } else if (rawEvents.length > 0) {
      setIsLoading(false);
      return;
    }

    // Initial authors: Following list
    const validAuthors = followingList.filter(a => !!a && /^[0-9a-fA-F]{64}$/.test(a));

    if (!validAuthors.length) {
      setIsLoading(false);
      return;
    }

    const filter: NDKFilter = {
      kinds: [1, 6, 16, 1068, 30023] as NDKKind[],
      authors: validAuthors,
      limit: 30,
    };

    if (interests.length > 0) {
      filter["#t"] = interests;
    }

    const options = {
      closeOnEose: false,
    };

    const handlers = {
      onEvents: async (events: NDKEvent[]) => {
        // Parallelize validation for initial chunk
        const validationResults = await Promise.all(
          events.map(async (event) => {
            if (seenIds.current.has(event.id)) return null;
            const ok = await validateEvent(event);
            if (!ok) return null;
            return event;
          })
        );

        const validEvents = validationResults.filter((e): e is NDKEvent => e !== null);
        
        if (validEvents.length > 0) {
          validEvents.forEach(e => seenIds.current.add(e.id));
          queueUpdate(validEvents);
        }
      },
      onEvent: async (event: NDKEvent) => {
        if (seenIds.current.has(event.id)) return;
        
        const ok = await validateEvent(event);
        if (!ok) return;

        seenIds.current.add(event.id);

        if (!isInitialLoadDone.current) {
          queueUpdate([event]);
        } else {
          bufferRef.current = [event, ...bufferRef.current];
          setNewCount(bufferRef.current.length);
        }
      },
      onEose: () => {
        setIsLoading(false);
        setTimeout(() => {
          isInitialLoadDone.current = true;
        }, 1500);
      }
    };

    const syncOptions = { ...options, ...handlers };

    if (sync) {
      sync.syncAndSubscribe(filter, syncOptions).then(sub => {
        subscriptionRef.current = sub;
      }).catch(() => {
        subscriptionRef.current = ndk.subscribe(filter, options, handlers);
      });
    } else {
      subscriptionRef.current = ndk.subscribe(filter, options, handlers);
    }

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.stop();
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, [ndk, isReady, sync, followingList, queueUpdate, interests, viewerPubkey, rawEvents.length]); 

  const flushNewPosts = useCallback(() => {
    if (!bufferRef.current.length) return;

    setRawEvents(prev => {
      const combined = [...bufferRef.current, ...prev].slice(0, 150);
      return combined.filter((v, i, a) => v && v.id && a.findIndex(t => t && t.id === v.id) === i);
    });

    bufferRef.current = [];
    setNewCount(0);
  }, []);

  const loadMore = useCallback(async () => {
    if (!ndk || !hasMore || !rawEvents.length) return;

    const oldest = Math.min(...rawEvents.map(p => p.created_at ?? Infinity));
    
    // Clean authors array to prevent validation errors
    const validAuthors = followingList.filter(a => !!a && /^[0-9a-fA-F]{64}$/.test(a));

    const olderFilter: NDKFilter = {
      kinds: [1, 6, 16, 1068, 30023] as NDKKind[],
      authors: validAuthors,
      until: oldest - 1,
      limit: 30,
    };

    if (interests.length > 0) {
      olderFilter["#t"] = interests;
    }

    const older = await ndk.fetchEvents(olderFilter);

    const newEvents = Array.from(older).filter(e => e && e.id && !seenIds.current.has(e.id));
    newEvents.forEach(e => seenIds.current.add(e.id));
    if (newEvents.length < 30) setHasMore(false);

    setRawEvents(prev => {
      const combined = [...prev, ...newEvents];
      return combined.filter((v, i, a) => v && v.id && a.findIndex(t => t && t.id === v.id) === i);
    });
  }, [ndk, rawEvents, hasMore, followingList, interests]); 
  
  return {
    posts,
    newCount,
    isLoading,
    wotStatus,
    wotSize,
    hasInterests,
    flushNewPosts,
    loadMore,
    hasMore,
  };
}
