"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { useNDK } from "@/hooks/useNDK";
import { useWoT, CachedWoT } from "./useWoT";
import { useUIStore } from "@/store/ui";

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

  const [rawEvents, setRawEvents] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const bufferRef = useRef<NDKEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);

  // Memoized ranked posts
  const posts = useMemo(() => {
    let baseEvents = rawEvents;
    
    // Strict Mode: Filter out anyone with 0 score (unknown/spam)
    if (wot && wotStrictMode) {
      baseEvents = rawEvents.filter(e => wot.getScore(e.pubkey) > 0);
    }

    if (!wot) return sortByTime(baseEvents);
    return rankByWoT(baseEvents, wot);
  }, [rawEvents, wot, wotStrictMode]);

  useEffect(() => {
    if (!ndk || !isReady || wotStatus === "idle") return;

    setIsLoading(true);
    seenIds.current = new Set();
    isInitialLoadDone.current = false;
    bufferRef.current = [];
    setRawEvents([]);

    const authors = wot
      ? wot.getAllPubkeys({ maxDepth: 2 }).slice(0, 500)
      : followingList;

    if (!authors.length) {
      setIsLoading(false);
      return;
    }

    const sub = ndk.subscribe(
      {
        kinds: [1, 1068, 30023] as NDKKind[],
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
  }, [ndk, isReady, wotStatus, followingList.join(","), wot]);

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
      kinds: [1, 1068, 30023] as NDKKind[],
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

function rankByWoT(events: NDKEvent[], wot: NDKWoT | CachedWoT): NDKEvent[] {
  const now = Date.now() / 1000;

  return [...events].sort((a, b) => {
    const scoreA = computeFinalScore(a, wot, now);
    const scoreB = computeFinalScore(b, wot, now);
    return scoreB - scoreA;
  });
}

function computeFinalScore(event: NDKEvent, wot: NDKWoT | CachedWoT, now: number): number {
  const wotScore = wot.getScore(event.pubkey) ?? 0;
  
  // Intersection-based boost: How many people you trust follow this user?
  const node = wot.getNode(event.pubkey);
  const mutualsCount = node?.followedBy?.size ?? 0;
  // Boost factor: log-based so it doesn't explode but rewards multiple mutuals
  const intersectionBoost = mutualsCount > 0 ? (1 + Math.log10(mutualsCount + 1)) : 1;

  // Hitung selisih waktu dalam jam
  const deltaHours = (now - (event.created_at ?? 0)) / 3600;
  
  // Parameter Half-life (bisa Anda sesuaikan)
  // 12 jam adalah angka yang pas untuk microblogging agar feed tetap segar
  const halfLife = 12; 

  // Rumus Exponential Decay
  const freshness = Math.pow(0.5, deltaHours / halfLife);

  // Tambahkan "Penalty" untuk postingan yang sudah sangat lama (misal > 3 hari)
  // agar tidak menghantui feed selamanya
  if (deltaHours > 72) return wotScore * intersectionBoost * freshness * 0.1;

  const randomFactor = 0.95 + Math.random() * 0.1; 
  return wotScore * intersectionBoost * freshness * randomFactor;
}


function sortByTime(events: NDKEvent[]): NDKEvent[] {
  return [...events].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
}
