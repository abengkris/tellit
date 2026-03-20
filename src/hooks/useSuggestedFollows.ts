"use client";

import { useState, useEffect, useMemo } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { NDKEvent, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useWoTNetwork } from "./useWoTNetwork";
import { useInteractionHistory } from "./useInteractionHistory";
import { useLists } from "./useLists";

interface Suggestion {
  pubkey: string;
  followedByCount: number;
  score: number;
  reason: string;
  topPost?: NDKEvent;
}

/**
 * Smart, Zero-Cost follow suggestions.
 * 
 * Ranks pubkeys based on:
 * 1. Mutual followers (Degree 2 in WoT)
 * 2. Interaction history (if you've replied to them but don't follow them)
 * 3. Interest matching (if they post about things you like)
 */
export function useSuggestedFollows(limit: number = 3) {
  const { isReady, ndk } = useNDK();
  const { user } = useAuthStore();
  const { historyMap } = useInteractionHistory();
  const { interests: myInterests } = useLists();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // We need a pool of candidates. 
  // Let's get people we've interacted with + a sample of D2 from the API
  useEffect(() => {
    if (!isReady || !user?.pubkey || !ndk) return;

    let isMounted = true;
    setLoading(true);

    async function fetchSuggestions() {
      try {
        // 1. Get D2 candidates from API (this is our primary discovery pool)
        const res = await fetch(`/api/wot/suggestions?pubkey=${user?.pubkey}&limit=50`);
        const data = await res.json();
        const apiCandidates: { pubkey: string }[] = data.suggestions || [];

        // 2. Get interaction candidates (people we replied to but might not follow)
        const interactionPubkeys = Array.from(historyMap.keys());

        // Merge and deduplicate
        const allCandidatePubkeys = Array.from(new Set([
          ...apiCandidates.map(c => c.pubkey),
          ...interactionPubkeys
        ])).filter(pk => pk !== user?.pubkey);

        // 3. Filter out people we already follow
        if (!ndk) return;
        const contactList = await ndk.fetchEvent({ kinds: [3], authors: [user!.pubkey] });
        const followingArray = contactList?.tags.filter(t => t[0] === 'p').map(t => t[1]) || [];
        const followingSet = new Set(followingArray);

        const freshCandidates = allCandidatePubkeys.filter(pk => !followingSet.has(pk));

        if (freshCandidates.length === 0) {
          if (isMounted) {
            setSuggestions([]);
            setLoading(false);
          }
          return;
        }

        // --- REAL MUTUALS CALCULATION (Zero-Cost via Cache) ---
        // Fetch contact lists of our top 50 follows from IndexedDB cache
        const topFollows = followingArray.slice(0, 50);
        const d1ContactLists = await ndk.fetchEvents(
          { kinds: [3], authors: topFollows },
          { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
        );

        // Map candidate -> count of D1s that follow them
        const mutualsCount = new Map<string, number>();
        d1ContactLists.forEach(cl => {
          cl.tags.forEach(t => {
            if (t[0] === 'p' && freshCandidates.includes(t[1])) {
              mutualsCount.set(t[1], (mutualsCount.get(t[1]) || 0) + 1);
            }
          });
        });

        // 4. Score candidates
        const scored: Suggestion[] = freshCandidates.map(pk => {
          let score = 0;
          let reason = "Suggested for you";

          // Interaction boost
          const interactions = historyMap.get(pk) || 0;
          if (interactions > 0) {
            score += interactions * 15;
            reason = "You've interacted with them";
          }

          // Mutuals boost (High Signal)
          const mutuals = mutualsCount.get(pk) || 0;
          if (mutuals > 0) {
            score += mutuals * 25;
            if (reason === "Suggested for you" || mutuals > 1) {
               reason = mutuals === 1 ? "Followed by 1 mutual friend" : `Followed by ${mutuals} mutual friends`;
            }
          }

          // D2 boost from API
          if (apiCandidates.some(c => c.pubkey === pk)) {
            score += 10;
          }

          return {
            pubkey: pk,
            followedByCount: mutuals,
            score,
            reason
          };
        });

        const sorted = scored
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        // 5. ENRICHMENT: Fetch Top Post for the winners
        const enriched = await Promise.all(sorted.map(async (s) => {
          const topPost = await ndk.fetchEvent(
            { kinds: [1], authors: [s.pubkey], limit: 1 },
            { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
          );
          return { ...s, topPost: topPost || undefined };
        }));

        if (isMounted) {
          setSuggestions(enriched);
        }
      } catch (err) {
        console.error("[useSuggestedFollows] Failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSuggestions();

    return () => {
      isMounted = false;
    };
  }, [isReady, user?.pubkey, historyMap, limit, ndk, myInterests]);

  return { suggestions, loading };
}
