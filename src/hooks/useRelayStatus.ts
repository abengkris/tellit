"use client";

import { useState, useEffect, useMemo } from "react";
import { useNDK } from "./useNDK";
import { NDKRelayStatus } from "@nostr-dev-kit/ndk";

export interface RelayStatus {
  url: string;
  status: NDKRelayStatus;
  latency?: number; // in milliseconds
}

export function useRelayStatus() {
  const { ndk, isReady } = useNDK();
  const [relays, setRelays] = useState<RelayStatus[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);

  useEffect(() => {
    if (!ndk || !isReady) return;

    const updateStatus = () => {
      const allRelays = Array.from(ndk.pool.relays.values());
      const statusList = allRelays.map((r) => {
        // NDKRelay typically has connectivityStats or similar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stats = (r as any).connectivityStats;
        const latency = stats?.latency;
        
        return {
          url: r.url,
          status: r.status,
          latency: latency
        };
      });
      
      setRelays((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(statusList)) return prev;
        return statusList;
      });
      setConnectedCount((prev) => {
        const next = allRelays.filter((r) => r.status === NDKRelayStatus.CONNECTED).length;
        return prev === next ? prev : next;
      });
    };

    // Initial check
    updateStatus();

    // Listen for changes
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, [ndk, isReady]);

  return useMemo(() => ({ 
    relays, 
    connectedCount, 
    totalCount: relays.length 
  }), [relays, connectedCount]);
}
