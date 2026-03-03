"use client";

import { useState, useEffect, useMemo } from "react";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useFollowingList } from "@/hooks/useFollowingList";

interface Suggestion {
  pubkey: string;
  followedByCount: number;
  followedByPubkeys: string[];
}

export function useFollowSuggestions(limit: number = 5, authorsLimit: number = 100) {
  const { ndk, isReady } = useNDK();
  const { user: currentUser } = useAuthStore();
  const { following: myFollowing, loading: followingLoading } = useFollowingList(currentUser?.pubkey);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ndk || !isReady || !currentUser || myFollowing.length === 0) return;

    let isMounted = true;
    setLoading(true);

    const fetchSuggestions = async () => {
      try {
        // 1. Fetch contact lists of people I follow (depth 2)
        const contactListEvents = await ndk.fetchEvents({
          kinds: [3],
          authors: myFollowing.slice(0, authorsLimit), 
        });

        if (!isMounted) return;

        // 2. Count occurrences of pubkeys in those contact lists
        const counts = new Map<string, { count: number; by: string[] }>();
        
        for (const event of contactListEvents) {
          for (const tag of event.tags) {
            if (tag[0] === "p" && tag[1]) {
              const targetPk = tag[1];
              
              // Skip myself and people I already follow
              if (targetPk === currentUser.pubkey || myFollowing.includes(targetPk)) {
                continue;
              }

              const current = counts.get(targetPk) || { count: 0, by: [] };
              if (!current.by.includes(event.pubkey)) {
                counts.set(targetPk, {
                  count: current.count + 1,
                  by: [...current.by, event.pubkey]
                });
              }
            }
          }
        }

        // 3. Sort by count and take top N
        const sorted = Array.from(counts.entries())
          .map(([pubkey, data]) => ({
            pubkey,
            followedByCount: data.count,
            followedByPubkeys: data.by
          }))
          .sort((a, b) => b.followedByCount - a.followedByCount)
          .slice(0, limit);

        setSuggestions(sorted);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSuggestions();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, currentUser?.pubkey, myFollowing, limit]);

  return { suggestions, loading: loading || followingLoading };
}
