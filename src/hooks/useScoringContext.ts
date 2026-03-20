"use client";

import { useEffect, useState, useRef } from "react";
import { useNDK } from "@/hooks/useNDK";
import { ScoringContext } from "@/lib/feed/scorer";

export function useScoringContext(
  viewerPubkey: string | undefined,
  followingList: string[]
): ScoringContext | null {
  const { ndk, isReady } = useNDK();
  const [ctx, setCtx] = useState<ScoringContext | null>(null);
  const buildingRef = useRef(false);

  useEffect(() => {
    if (!ndk || !isReady || !viewerPubkey || !followingList.length || buildingRef.current) return;
    buildingRef.current = true;

    async function build() {
      if (!ndk) return;

      const followsOfFollows = new Set<string>();
      const contactListEvents = await ndk.fetchEvents({
        kinds: [3],
        authors: followingList.slice(0, 150), 
      });

      for (const ev of contactListEvents) {
        for (const tag of ev.tags) {
          if (tag[0] === "p" && tag[1]) {
            followsOfFollows.add(tag[1]);
          }
        }
      }
      
      followsOfFollows.delete(viewerPubkey!);
      for (const pk of followingList) followsOfFollows.delete(pk);

      const interactionHistory = new Map<string, number>();
      const myRecentActivity = await ndk.fetchEvents({
        kinds: [1, 7], 
        authors: [viewerPubkey!],
        limit: 500,
        since: Math.floor(Date.now() / 1000) - 30 * 24 * 3600, 
      });

      for (const ev of myRecentActivity) {
        for (const tag of ev.tags) {
          if (tag[0] === "p" && tag[1]) {
            interactionHistory.set(
              tag[1],
              (interactionHistory.get(tag[1]) ?? 0) + 1
            );
          }
        }
      }

      // Fetch Redis-backed WoT network degrees for the following list
      // This is helpful for prioritizing direct follows that are also verified in Redis
      const networkDegreeMap = new Map<string, number>();
      try {
        const res = await fetch("/api/wot/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            viewerPubkey: viewerPubkey!,
            pubkeys: followingList.slice(0, 500)
          })
        });
        const data = await res.json();
        if (data.network) {
          Object.entries(data.network).forEach(([pk, degree]) => {
            networkDegreeMap.set(pk, degree as number);
          });
        }
      } catch (err) {
        console.error("[useScoringContext] Failed to fetch WoT network:", err);
      }

      setCtx({
        viewerPubkey: viewerPubkey!,
        followingSet: new Set(followingList),
        followsOfFollowsSet: followsOfFollows,
        interactionHistory,
        networkDegreeMap,
      });
    }

    build().catch(console.error);
  }, [ndk, isReady, viewerPubkey, followingList]);  

  return ctx;
}
