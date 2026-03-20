"use client";

import { useEffect, useState, useMemo } from "react";
import { useNDK } from "./useNDK";

/**
 * Hook to fetch trust network degrees (D1, D2) for a list of pubkeys.
 */
export function useWoTNetwork(pubkeys: string[]) {
  const { activeSession } = useNDK();
  const [network, setNetwork] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Memoize the array to prevent unnecessary re-fetches
  // We use the array length as a heuristic or just the array itself
  // but since it's a new array on every render usually, we should be careful.
  // For now, let's follow lint rules.
  const memoPubkeys = useMemo(() => Array.from(new Set(pubkeys)), [pubkeys]);

  useEffect(() => {
    if (!activeSession?.pubkey || memoPubkeys.length === 0) return;

    let mounted = true;
    Promise.resolve().then(() => setLoading(true));

    fetch("/api/wot/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewerPubkey: activeSession.pubkey,
        pubkeys: memoPubkeys,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.network) {
          setNetwork((prev) => ({ ...prev, ...data.network }));
        }
      })
      .catch((err) => console.error("[useWoTNetwork] Fetch failed:", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeSession?.pubkey, memoPubkeys]);

  return { network, loading };
}
