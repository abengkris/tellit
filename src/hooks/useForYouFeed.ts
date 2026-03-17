"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NDKEvent, NDKKind, NDKSubscription, NDKFilter } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useWoT } from "./useWoT";
import { useUIStore } from "@/store/ui";
import { rankEvents, ScoringContext } from "@/lib/feed/scorer";
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
  const { wot, trustScores, status: wotStatus, pubkeyCount: wotSize } = useWoT(viewerPubkey);
  const { wotStrictMode } = useUIStore();

  const [rawEvents, setRawEvents] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const hasInterests = interests.length > 0;

  // Buffer for batching updates to rawEvents to avoid excessive re-renders
  const updateBufferRef = useRef<NDKEvent[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const bufferRef = useRef<NDKEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);
  const prevFollowingListRef = useRef<string>("");

  // Memoized mutuals map to avoid re-calculating on every event
  const mutualsMap = useMemo(() => {
    if (!wot) return new Map<string, number>();
    const map = new Map<string, number>();
    const allWoTPubkeys = wot.getAllPubkeys();
    for (const pk of allWoTPubkeys) {
      const node = wot.getNode(pk);
      if (node && node.followedBy) {
        map.set(pk, node.followedBy.size);
      }
    }
    return map;
  }, [wot]);

  // Memoized ranked posts using advanced scorer
  const posts = useMemo(() => {
    let baseEvents = rawEvents;
    
    // Strict Mode: Filter out anyone with 0 score (unknown/spam)
    if (wot && wotStrictMode) {
      baseEvents = rawEvents.filter(e => wot.getScore(e.pubkey) > 0);
    }

    if (!wot) return sortByTime(baseEvents);

    // Prepare context for the scorer
    const context: ScoringContext = {
      viewerPubkey,
      followingSet: new Set(followingList),
      followsOfFollowsSet: new Set(wot.getAllPubkeys()),
      interactionHistory: new Map(), // To be implemented if we start tracking this
      trustScores,
      mutualsMap,
      interestsSet: new Set(interests),
    };

    return rankEvents(baseEvents, context)
      .filter(se => se && se.event && se.event.id)
      .map(se => se.event);
  }, [rawEvents, wot, wotStrictMode, followingList, viewerPubkey, trustScores, mutualsMap, interests]);

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
  }, []);

  const queueUpdate = useCallback((events: NDKEvent[]) => {
    updateBufferRef.current.push(...events);
    if (!updateTimeoutRef.current) {
      updateTimeoutRef.current = setTimeout(processUpdateBuffer, 200);
    }
  }, [processUpdateBuffer]);

  useEffect(() => {
    if (!ndk || !isReady || wotStatus === "idle") return;

    const followingStr = JSON.stringify(followingList);
    const listChanged = followingStr !== prevFollowingListRef.current;

    if (listChanged) {
      setIsLoading(true);
      seenIds.current = new Set();
      isInitialLoadDone.current = false;
      bufferRef.current = [];
      setRawEvents([]);
      prevFollowingListRef.current = followingStr;
    } else if (rawEvents.length > 0) {
      setIsLoading(false);
      return;
    }

    // Smart Author Selection:
    // 1. All following list (direct trust)
    // 2. High-trust FoF (score > 0) up to a reasonable limit for relay health
    let authors = followingList;
    if (wot) {
      const allPubkeys = wot.getAllPubkeys({ maxDepth: 2 });
      const fof = allPubkeys
        .filter(pk => !followingList.includes(pk) && pk !== viewerPubkey)
        .sort((a, b) => (wot.getScore(b) || 0) - (wot.getScore(a) || 0));
      
      authors = [...followingList, ...fof.slice(0, 400)];
    }

    // Clean authors array to prevent validation errors
    const validAuthors = authors.filter(a => !!a && /^[0-9a-fA-F]{64}$/.test(a));

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
  }, [ndk, isReady, sync, wotStatus, followingList, wot, queueUpdate, interests, viewerPubkey, rawEvents.length]); 

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
    
    let authors = followingList;
    if (wot) {
      const allPubkeys = wot.getAllPubkeys({ maxDepth: 2 });
      const fof = allPubkeys
        .filter(pk => !followingList.includes(pk) && pk !== viewerPubkey)
        .sort((a, b) => (wot.getScore(b) || 0) - (wot.getScore(a) || 0));
      
      authors = [...followingList, ...fof.slice(0, 400)];
    }

    // Clean authors array to prevent validation errors
    const validAuthors = authors.filter(a => !!a && /^[0-9a-fA-F]{64}$/.test(a));

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
  }, [ndk, rawEvents, hasMore, followingList, wot, viewerPubkey, interests]); 
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

function sortByTime(events: NDKEvent[]): NDKEvent[] {
  return [...events].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
}
