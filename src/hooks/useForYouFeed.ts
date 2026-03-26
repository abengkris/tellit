"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NDKEvent, NDKKind, NDKSubscription, NDKFilter, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useWoTNetwork } from "./useWoTNetwork";
import { useUIStore } from "@/store/ui";
import { useInteractionHistory } from "./useInteractionHistory";
import { ScoredEvent, ScoringWorkerMessage } from "@/lib/feed/types";
import { fetchWoTSignals } from "@/lib/feed/signals/wot";
import { validateEvent } from "@/lib/policies";


interface UseForYouFeedOptions {
  viewerPubkey: string;
  followingList: string[];
  interests: string[];
}

interface UseForYouFeedReturn {
  posts: NDKEvent[];
  scoredEvents: ScoredEvent[];
  newCount: number;
  isLoading: boolean;
  isProcessing: boolean;
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
  const { topInteracted, historyMap } = useInteractionHistory();
  
  // Discover authors (following + degree 2)
  const [discoverAuthors, setDiscoverAuthors] = useState<string[]>(followingList);
  
  // Use the new on-demand WoT Network
  // We'll pass the following list initially, and then extend it as we see more events
  const [discoverPubkeys, setDiscoverPubkeys] = useState<string[]>(followingList);
  const { network, loading: wotLoading } = useWoTNetwork(discoverPubkeys);

  const [rawEvents, setRawEvents] = useState<NDKEvent[]>([]);
  const [rankedPosts, setRankedPosts] = useState<NDKEvent[]>([]);
  const [pendingRankedPosts, setPendingRankedPosts] = useState<NDKEvent[] | null>(null);
  const [currentScoredEvents, setCurrentScoredEvents] = useState<ScoredEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoring, setIsScoring] = useState(false);
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
  const sentIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);
  const prevFollowingListRef = useRef<string>("");
  const discoveryInitializedRef = useRef(false);

  // Worker for background scoring
  const workerRef = useRef<Worker | null>(null);
  const scoringTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL("@/lib/feed/scoring.worker.ts", import.meta.url));
    
    workerRef.current.onmessage = (e: MessageEvent<ScoringWorkerMessage>) => {
      if (!ndk) return;
      
      const message = e.data;
      if (message.type === 'BATCH_RESULTS') {
        const scoredEvents = message.results;
        setCurrentScoredEvents(scoredEvents);
        const events = scoredEvents.map(se => {
          const event = new NDKEvent(ndk, se.event);
          return event;
        });

        if (window.scrollY < 100) {
          setRankedPosts(events);
          setPendingRankedPosts(null);
        } else {
          // If user is scrolled down, buffer the new ranking to prevent jumping
          setPendingRankedPosts(events);
        }
        setIsScoring(false);
      } else if (message.type === 'ERROR') {
        console.error("[useForYouFeed] Scoring worker error:", message.error);
        setIsScoring(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [ndk]);

  // Expand discovery authors (D2) based on top interacted
  useEffect(() => {
    if (!ndk || !isReady || discoveryInitializedRef.current) return;
    
    const top = topInteracted(10);
    if (top.length === 0) return;

    discoveryInitializedRef.current = true;
    
    // Fetch contact lists of top interacted people to find potential D2 content
    ndk.fetchEvents({
      kinds: [3],
      authors: top,
    }).then(events => {
      const d2Authors = new Set<string>();
      events.forEach(ev => {
        // Pick random 5 follows from each top contact list
        const follows = ev.tags
          .filter(t => t[0] === "p" && t[1])
          .map(t => t[1]);
        
        const shuffled = follows.sort(() => 0.5 - Math.random());
        shuffled.slice(0, 5).forEach(p => d2Authors.add(p));
      });

      if (d2Authors.size > 0) {
        setDiscoverAuthors(prev => {
          const next = Array.from(new Set([...prev, ...d2Authors]));
          if (next.length === prev.length) return prev;
          return next;
        });
        setDiscoverPubkeys(prev => {
          const next = Array.from(new Set([...prev, ...d2Authors]));
          if (next.length === prev.length) return prev;
          return next;
        });
      }
    }).catch(err => console.error("[useForYouFeed] D2 discovery failed:", err));
  }, [ndk, isReady, topInteracted]);

  // Trigger worker-based scoring when inputs change
  useEffect(() => {
    if (!workerRef.current || !isReady || !ndk) return;

    if (scoringTimeoutRef.current) clearTimeout(scoringTimeoutRef.current);

    scoringTimeoutRef.current = setTimeout(async () => {
      // 1. Identify new events not yet sent to worker
      const newEvents = rawEvents.filter(e => !sentIds.current.has(e.id));
      
      if (newEvents.length === 0) return;

      // 2. Fetch WoT signals for all authors in the current raw feed
      const allAuthors = Array.from(new Set(rawEvents.map(e => e.pubkey)));
      const wotSignals = await fetchWoTSignals(allAuthors);

      // 3. Prepare context for the worker (plain objects only)
      const context = {
        viewerPubkey,
        followingSet: Array.from(followingList),
        interactionHistory: Object.fromEntries(historyMap.entries()), 
        networkDegreeMap: network, 
        interestsSet: Array.from(interests),
        wotScores: Object.fromEntries(wotSignals.entries()),
      };

      const plainEvents = newEvents.map(e => e.rawEvent());
      
      // Mark as sent
      newEvents.forEach(e => sentIds.current.add(e.id));

      workerRef.current?.postMessage({
        type: 'SCORE_BATCH',
        events: plainEvents,
        ctx: context, // Always send context to ensure worker is up to date with settings
      });
      setIsScoring(true);
    }, 500); 

    return () => {
      if (scoringTimeoutRef.current) clearTimeout(scoringTimeoutRef.current);
    };
  }, [rawEvents, wotStrictMode, followingList, viewerPubkey, network, interests, isReady, ndk, historyMap]);

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
      
      if (uniqueMap.size === prev.length) return prev;
      return Array.from(uniqueMap.values());
    });
    
    // Auto-discover new pubkeys to check trust for
    const newPubkeys = newEvents.map(e => e.pubkey);
    setDiscoverPubkeys(prev => {
      const next = Array.from(new Set([...prev, ...newPubkeys])).slice(0, 1000);
      if (next.length === prev.length) return prev;
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
        setRawEvents((prev) => (prev.length === 0 ? prev : []));
      });
      seenIds.current = new Set();
      isInitialLoadDone.current = false;
      bufferRef.current = [];
      prevFollowingListRef.current = followingStr;
      Promise.resolve().then(() => {
        setDiscoverPubkeys((prev) => (prev.length === followingList.length ? prev : followingList));
      });
    } else if (rawEvents.length > 0 && isLoading) {
      Promise.resolve().then(() => setIsLoading(false));
      return;
    }

    // Use discoverAuthors (following + D2)
    const validAuthors = discoverAuthors.filter(a => !!a && /^[0-9a-fA-F]{64}$/.test(a));

    if (!validAuthors.length) {
      if (isLoading) Promise.resolve().then(() => setIsLoading(false));
      return;
    }

    const filter: NDKFilter = {
      kinds: [1, 6, 16, 1068, 30023] as NDKKind[],
      authors: validAuthors,
      limit: 50,
    };

    if (interests.length > 0) {
      filter["#t"] = interests;
    }

    const options = {
      closeOnEose: false,
      groupable: true,
      groupableDelay: 250,
      cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
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
          setNewCount((prev) => {
            const next = bufferRef.current.length;
            return prev === next ? prev : next;
          });
        }
      },
      onEose: () => {
        Promise.resolve().then(() => {
          setIsLoading((prev) => (prev === false ? prev : false));
        });
        setTimeout(() => {
          isInitialLoadDone.current = true;
        }, 2000);
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
  }, [ndk, isReady, sync, followingList, discoverAuthors, queueUpdate, interests, viewerPubkey, rawEvents.length, isLoading]); 

  const flushNewPosts = useCallback(() => {
    if (pendingRankedPosts) {
      setRankedPosts(pendingRankedPosts);
      setPendingRankedPosts(null);
    }

    if (!bufferRef.current.length) return;

    setRawEvents(prev => {
      const combined = [...bufferRef.current, ...prev].slice(0, 150);
      const unique = combined.filter((v, i, a) => v && v.id && a.findIndex(t => t && t.id === v.id) === i);
      if (unique.length === prev.length) return prev;
      return unique;
    });

    bufferRef.current = [];
    setNewCount(0);
  }, [pendingRankedPosts]);

  const loadMore = useCallback(async () => {
    if (!ndk || !hasMore || !rawEvents.length) return;

    const oldest = Math.min(...rawEvents.map(p => p.created_at ?? Infinity));
    
    // Clean authors array to prevent validation errors
    const validAuthors = discoverAuthors.filter(a => !!a && /^[0-9a-fA-F]{64}$/.test(a));

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
    
    const nextHasMore = newEvents.length >= 30;
    setHasMore((prev) => (prev === nextHasMore ? prev : nextHasMore));

    setRawEvents(prev => {
      const combined = [...prev, ...newEvents];
      const unique = combined.filter((v, i, a) => v && v.id && a.findIndex(t => t && t.id === v.id) === i);
      if (unique.length === prev.length) return prev;
      return unique;
    });
  }, [ndk, rawEvents, hasMore, discoverAuthors, interests]); 
  
  return useMemo(() => ({
    posts,
    scoredEvents: currentScoredEvents,
    newCount,
    isLoading,
    isProcessing: isScoring,
    wotStatus,
    wotSize,
    hasInterests,
    flushNewPosts,
    loadMore,
    hasMore,
  }), [
    posts,
    currentScoredEvents,
    newCount,
    isLoading,
    isScoring,
    wotStatus,
    wotSize,
    hasInterests,
    flushNewPosts,
    loadMore,
    hasMore
  ]);
}
