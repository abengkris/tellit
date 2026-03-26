import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";

// Global cache for following lists to avoid repeat fetches in the same session
const globalFollowingCache = new Map<string, string[]>();

export function useFollowing(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [following, setFollowing] = useState<string[]>(pubkey ? (globalFollowingCache.get(pubkey) || []) : []);
  const [loading, setLoading] = useState(false);
  const lastFetchedPubkey = useRef<string | undefined>(undefined);

  const fetchFollowing = useCallback(async (forceRelay = false) => {
    if (!ndk || !isReady || !pubkey) return;

    setLoading(true);
    lastFetchedPubkey.current = pubkey;

    try {
      // 1. Try Cache-Only first if we don't have it in memory
      const hasFollowing = globalFollowingCache.has(pubkey);
      if (!hasFollowing && !forceRelay) {
        const cachedEvent = await ndk.fetchEvent(
          { kinds: [3], authors: [pubkey] },
          { cacheUsage: NDKSubscriptionCacheUsage.ONLY_CACHE }
        );

        if (cachedEvent) {
          const pubkeys = cachedEvent.tags
            .filter((t) => t[0] === "p" && t[1])
            .map((t) => t[1]);
          globalFollowingCache.set(pubkey, pubkeys);
          setFollowing(pubkeys);
          setLoading(false);
        }
      }

      // 2. Fetch from Relays
      const contactListEvent = await ndk.fetchEvent(
        { kinds: [3], authors: [pubkey] },
        { 
          cacheUsage: forceRelay ? NDKSubscriptionCacheUsage.ONLY_RELAY : NDKSubscriptionCacheUsage.CACHE_FIRST,
          relayGoalPerAuthor: 3 
        }
      );

      if (contactListEvent) {
        const pubkeys = contactListEvent.tags
          .filter((t) => t[0] === "p" && t[1])
          .map((t) => t[1]);
        globalFollowingCache.set(pubkey, pubkeys);
        setFollowing(pubkeys);
      }
    } catch (error) {
      console.error("Error fetching following for", pubkey, error);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, pubkey]);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setFollowing((prev) => (prev.length === 0 ? prev : []));
      setLoading((prev) => (prev === false ? prev : false));
      return;
    }

    // Check memory cache instantly
    const cached = globalFollowingCache.get(pubkey);
    if (cached) {
      setFollowing(cached);
      if (lastFetchedPubkey.current === pubkey) return;
    }

    fetchFollowing();
  }, [ndk, isReady, pubkey, fetchFollowing]);

  const refresh = useCallback(() => fetchFollowing(true), [fetchFollowing]);

  return useMemo(() => ({ 
    following, 
    loading, 
    refresh 
  }), [following, loading, refresh]);
}
