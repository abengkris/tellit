"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { NDKWoT } from "@nostr-dev-kit/wot";
import { useNDK } from "@/hooks/useNDK";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { useWoT, CachedWoT } from "./useWoT";
import { useUIStore } from "@/store/ui";
import { useLists } from "@/hooks/useLists";
import { rankEvents, ScoringContext } from "@/lib/feed/scorer";

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
  const { wot, status: wotStatus, pubkeyCount: wotSize } = useWoT(viewerPubkey);
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

    // Prepare context for the scorer
    const context: ScoringContext = {
      viewerPubkey,
      followingSet: new Set(followingList),
      followsOfFollowsSet: new Set(wot.getAllPubkeys()),
      interactionHistory: new Map(), // To be implemented if we start tracking this
      mutedSet: mutedPubkeys,
    };

    return rankEvents(baseEvents, context).map(se => se.event);
  }, [rawEvents, wot, wotStrictMode, followingList, mutedPubkeys, viewerPubkey]);

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
      setIsLoading(false);
      return;
    }

    const authors = wot
      ? wot.getAllPubkeys({ maxDepth: 2 }).slice(0, 500)
      : followingList;

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
      }
    );

    sub.on("event", (event: NDKEvent) => {
      if (seenIds.current.has(event.id)) return;
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
    });

    sub.on("eose", () => {
      setIsLoading(false);
      setTimeout(() => {
        isInitialLoadDone.current = true;
      }, 1500);
    });

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
    const authors = wot ? wot.getAllPubkeys({ maxDepth: 2 }).slice(0, 500) : followingList;

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
  }, [ndk, rawEvents, hasMore, followingList, wot]);

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
