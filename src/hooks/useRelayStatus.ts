"use client";

import { useState, useEffect, useMemo } from "react";
import { useNDK } from "./useNDK";
import { NDKRelayStatus } from "@nostr-dev-kit/ndk";
import { DEFAULT_RELAYS } from "@/lib/ndk";

export interface RelayStatus {
  url: string;
  status: NDKRelayStatus;
  latency?: number; // in milliseconds
  isNostrify?: boolean;
}

export function useRelayStatus() {
  const { ndk, isReady } = useNDK();
  const [relays, setRelays] = useState<RelayStatus[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      const statusList: RelayStatus[] = [];
      
      // 1. Get NDK Relays if available
      if (ndk && isReady) {
        const ndkRelays = Array.from(ndk.pool.relays.values());
        ndkRelays.forEach((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stats = (r as any).connectivityStats;
          statusList.push({
            url: r.url,
            status: r.status,
            latency: stats?.latency
          });
        });
      }

      // 2. Add Nostrify Relays (Default Relays)
      // Since Nostrify pool doesn't expose granular status yet, 
      // we mark them as connected if the pool is initialized.
      DEFAULT_RELAYS.forEach(url => {
        if (!statusList.some(r => r.url === url)) {
          statusList.push({
            url,
            status: NDKRelayStatus.CONNECTED,
            isNostrify: true
          });
        }
      });
      
      setRelays((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(statusList)) return prev;
        return statusList;
      });
      
      setConnectedCount(statusList.filter((r) => r.status === NDKRelayStatus.CONNECTED).length);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);

    return () => clearInterval(interval);
  }, [ndk, isReady]);

  return useMemo(() => ({ 
    relays, 
    connectedCount, 
    totalCount: relays.length 
  }), [relays, connectedCount]);
}
