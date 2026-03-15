"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useWoT } from "./useWoT";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { rankEvents, ScoringContext } from "@/lib/feed/scorer";
import { validateEvent } from "@/lib/policies";

interface UseForYouFeedOptions {
  viewerPubkey: string;
  followingList: string[];
}

interface UseForYouFeedReturn {
  posts: NDKEvent[];
  newCount: number;
  isLoading: boolean;
  wotStatus: "idle" | "loading" | "ready" | "error";
  wotSize: number;            
  flushNewPosts: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useForYouFeed({
  viewerPubkey,
  followingList,
}: UseForYouFeedOptions): UseForYouFeedReturn {
  const { ndk, isReady } = useNDK();
  const { wot, trustScores, status: wotStatus, pubkeyCount: wotSize } = useWoT(viewerPubkey);
  const { wotStrictMode } = useUIStore();
  const { mutedPubkeys } = useLists();

  const [rawEvents, setRawEvents] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const bufferRef = useRef<NDKEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);
  const prevFollowingListRef = useRef<string>("");

  // Memoized ranked posts using advanced scorer
  const posts = useMemo(() => {
    let baseEvents = rawEvents;
    
    // Strict Mode: Filter out anyone with 0 score (unknown/spam)
    if (wot && wotStrictMode) {
      baseEvents = rawEvents.filter(e => wot.getScore(e.pubkey) > 0);
    }

    if (!wot) return sortByTime(baseEvents);

    // Build mutuals map for the scorer
    const mutualsMap = new Map<string, number>();
    const allWoTPubkeys = wot.getAllPubkeys();
    for (const pk of allWoTPubkeys) {
      const node = wot.getNode(pk);
      if (node && node.followedBy) {
        mutualsMap.set(pk, node.followedBy.size);
      }
    }

    // Prepare context for the scorer
    const context: ScoringContext = {
      viewerPubkey,
      followingSet: new Set(followingList),
      followsOfFollowsSet: new Set(allWoTPubkeys),
      interactionHistory: new Map(), // To be implemented if we start tracking this
      mutedSet: mutedPubkeys,
      trustScores,
      mutualsMap,
    };

    return rankEvents(baseEvents, context).map(se => se.event);
  }, [rawEvents, wot, wotStrictMode, followingList, mutedPubkeys, viewerPubkey, trustScores]);

  useEffect(() => {
    if (!ndk || !isReady || wotStatus === "idle") return;

    const followingStr = JSON.stringify(followingList);
    const listChanged = followingStr !== prevFollowingListRef.current;

    if (listChanged) {
      Promise.resolve().then(() => {
        setIsLoading(true);
        seenIds.current = new Set();
        isInitialLoadDone.current = false;
        bufferRef.current = [];
        setRawEvents([]);
      });
      prevFollowingListRef.current = followingStr;
    } else if (rawEvents.length > 0) {
      Promise.resolve().then(() => setIsLoading(false));
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

    if (!authors.length) {
      Promise.resolve().then(() => setIsLoading(false));
      return;
    }

    const sub = ndk.subscribe(
      {
        kinds: [1, 6, 16, 1068, 30023] as NDKKind[],
        authors,
        limit: 30,
      },
      {
        closeOnEose: false,
      },
      {
        onEvents: async (events) => {
          const validEvents: NDKEvent[] = [];
          for (const event of events) {
            if (seenIds.current.has(event.id)) continue;
            const ok = await validateEvent(event);
            if (!ok) continue;
            seenIds.current.add(event.id);
            validEvents.push(event);
          }

          if (validEvents.length > 0) {
            setRawEvents(prev => {
              const combined = [...prev, ...validEvents];
              return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            });
          }
        },
        onEvent: async (event: NDKEvent) => {
          if (seenIds.current.has(event.id)) return;
          
          const ok = await validateEvent(event);
          if (!ok) return;

          seenIds.current.add(event.id);

          if (!isInitialLoadDone.current) {
            setRawEvents(prev => {
              const combined = [...prev, event];
              return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            });
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
      }
    );

    return () => sub.stop();
  }, [ndk, isReady, wotStatus, followingList, wot]); // eslint-disable-line react-hooks/exhaustive-deps

  const flushNewPosts = useCallback(() => {
    if (!bufferRef.current.length) return;

    setRawEvents(prev => {
      const combined = [...bufferRef.current, ...prev].slice(0, 150);
      return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
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

    const older = await ndk.fetchEvents({
      kinds: [1, 6, 16, 1068, 30023] as NDKKind[],
      authors,
      until: oldest - 1,
      limit: 30,
    });

    const newEvents = Array.from(older).filter(e => !seenIds.current.has(e.id));
    newEvents.forEach(e => seenIds.current.add(e.id));
    if (newEvents.length < 30) setHasMore(false);

    setRawEvents(prev => {
    const combined = [...prev, ...newEvents];
    return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    });
    }, [ndk, rawEvents, hasMore, followingList, wot, viewerPubkey]);
  return {
    posts,
    newCount,
    isLoading,
    wotStatus,
    wotSize,
    flushNewPosts,
    loadMore,
    hasMore,
  };
}

function sortByTime(events: NDKEvent[]): NDKEvent[] {
  return [...events].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
}
