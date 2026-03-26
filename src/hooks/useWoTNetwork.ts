"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useNDK } from "./useNDK";

// Local cache to persist trust levels across component remounts within the same session
const globalTrustCache: Record<string, number> = {};

/**
 * Hook to fetch trust network degrees (D1, D2) for a list of pubkeys.
 */
export function useWoTNetwork(pubkeys: string[]) {
  const { activeSession } = useNDK();
  const [network, setNetwork] = useState<Record<string, number>>(globalTrustCache);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize and filter out pubkeys we already know the trust level for
  const unknownPubkeys = useMemo(() => {
    return pubkeys.filter(pk => globalTrustCache[pk] === undefined);
  }, [pubkeys]); // Include network to re-evaluate when cache updates

  useEffect(() => {
    if (!activeSession?.pubkey || unknownPubkeys.length === 0) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Debounce API calls by 400ms to batch rapid-fire requests
    timeoutRef.current = setTimeout(() => {
      const mounted = true;
      setLoading(true);

      fetch("/api/wot/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewerPubkey: activeSession.pubkey,
          pubkeys: unknownPubkeys,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (mounted && data.network && Object.keys(data.network).length > 0) {
            // Update global cache
            Object.assign(globalTrustCache, data.network);
            setNetwork((prev) => {
              const next = { ...prev, ...data.network };
              if (Object.keys(next).length === Object.keys(prev).length) return prev;
              return next;
            });
          }
        })
        .catch((err) => console.error("[useWoTNetwork] Fetch failed:", err))
        .finally(() => {
          if (mounted) setLoading(prev => (prev === false ? prev : false));
        });
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeSession?.pubkey, unknownPubkeys]);

  return useMemo(() => ({ network, loading }), [network, loading]);
}
