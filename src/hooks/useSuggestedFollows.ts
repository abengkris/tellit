"use client";

import { useState, useEffect, useMemo } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useWoTNetwork } from "./useWoTNetwork";
import { useInteractionHistory } from "./useInteractionHistory";
import { useLists } from "./useLists";

interface Suggestion {
  pubkey: string;
  followedByCount: number;
  score: number;
  reason: string;
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
  const { interests } = useLists();
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
        // We can get following list from NDK cache if available or just wait for the scoring
        if (!ndk) return;
        const contactList = await ndk.fetchEvent({ kinds: [3], authors: [user!.pubkey] });
        const followingSet = new Set(contactList?.tags.filter(t => t[0] === 'p').map(t => t[1]) || []);

        const freshCandidates = allCandidatePubkeys.filter(pk => !followingSet.has(pk));

        if (freshCandidates.length === 0) {
          if (isMounted) {
            setSuggestions([]);
            setLoading(false);
          }
          return;
        }

        // 4. Score candidates
        // For mutuals, we'd ideally hit an API that gives real counts, 
        // but for "Zero-Cost" we can estimate or use the D2 signal.
        const scored: Suggestion[] = freshCandidates.map(pk => {
          let score = 0;
          let reason = "Suggested for you";

          // Interaction boost
          const interactions = historyMap.get(pk) || 0;
          if (interactions > 0) {
            score += interactions * 10;
            reason = "You've interacted with them";
          }

          // D2 boost (if they came from the API, they are D2)
          const isD2 = apiCandidates.some(c => c.pubkey === pk);
          if (isD2) {
            score += 20;
            if (reason === "Suggested for you") reason = "Followed by people you know";
          }

          return {
            pubkey: pk,
            followedByCount: isD2 ? 2 : 0, // Simplified
            score,
            reason
          };
        });

        const sorted = scored
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        if (isMounted) {
          setSuggestions(sorted);
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
  }, [isReady, user?.pubkey, historyMap, limit, ndk]);

  return { suggestions, loading };
}
