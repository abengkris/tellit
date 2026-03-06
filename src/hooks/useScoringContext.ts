"use client";

import { useEffect, useState, useRef } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useWoT } from "@/hooks/useWoT";
import { ScoringContext } from "@/lib/feed/scorer";

export function useScoringContext(
  viewerPubkey: string | undefined,
  followingList: string[]
): ScoringContext | null {
  const { ndk, isReady } = useNDK();
  const { wot, trustScores } = useWoT(viewerPubkey);
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

      const mutedSet = new Set<string>();
      const muteListEvent = await ndk.fetchEvent({
        kinds: [10000],
        authors: [viewerPubkey!],
      });
      if (muteListEvent) {
        for (const tag of muteListEvent.tags) {
          if (tag[0] === "p" && tag[1]) mutedSet.add(tag[1]);
        }
      }

      setCtx({
        viewerPubkey: viewerPubkey!,
        followingSet: new Set(followingList),
        followsOfFollowsSet: followsOfFollows,
        interactionHistory,
        mutedSet,
        trustScores: trustScores,
      });
    }

    build().catch(console.error);
  }, [ndk, isReady, viewerPubkey, followingList.join(","), trustScores]);

  return ctx;
}
