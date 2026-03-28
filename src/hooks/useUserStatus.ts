import { useEffect, useState, useCallback, useRef } from "react";
import { type NostrFilter, type NostrEvent } from "@nostrify/types";
import { getStorage } from "@/lib/nostrify-storage";
import { createRelayPool } from "@/lib/nostrify-relay";
import { DEFAULT_RELAYS } from "@/lib/ndk";

export interface UserStatus {
  content: string;
  type: string; // "general", "music", etc.
  link?: string;
  expiration?: number;
}

/**
 * Hook to fetch and manage user status (Kind 30315) using Nostrify.
 */
export function useUserStatus(pubkey?: string) {
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const parseStatus = useCallback((event: NostrEvent): UserStatus | null => {
    const dTag = event.tags.find(t => t[0] === 'd');
    if (!dTag) return null;

    const type = dTag[1];
    const expirationTag = event.tags.find(t => t[0] === 'expiration');
    const rTag = event.tags.find(t => t[0] === 'r');

    const expiration = expirationTag ? parseInt(expirationTag[1]) : undefined;
    
    // Filter out expired statuses
    if (expiration && expiration < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      content: event.content,
      type,
      link: rTag ? rTag[1] : undefined,
      expiration
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!pubkey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const storage = await getStorage();
      const filter: NostrFilter = { kinds: [30315], authors: [pubkey] };

      // 1. Fetch from Storage first
      if (storage) {
        const cached = await storage.query([filter]);
        const newStatuses: Record<string, UserStatus> = {};
        
        cached.forEach(event => {
          const status = parseStatus(event);
          if (status) {
            newStatuses[status.type] = status;
          }
        });

        if (Object.keys(newStatuses).length > 0) {
          setStatuses(prev => ({
            ...prev,
            ...newStatuses
          }));
        }
      }

      // 2. Fetch and Subscribe from Relays
      const pool = createRelayPool(DEFAULT_RELAYS);
      const stream = pool.req([filter], { signal });

      for await (const msg of stream) {
        if (signal.aborted) break;

        if (msg[0] === 'EVENT') {
          const event = msg[2];
          const status = parseStatus(event);
          if (status) {
            setStatuses(prev => ({
              ...prev,
              [status.type]: status
            }));
          }
          // Optionally save to storage
          if (storage) {
            storage.event(event).catch(() => {});
          }
        } else if (msg[0] === 'EOSE') {
          setLoading(false);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("[useUserStatus] Error fetching status:", error);
      setLoading(false);
    }
  }, [pubkey, parseStatus]);

  useEffect(() => {
    fetchStatus();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStatus]);

  return { 
    statuses, 
    generalStatus: statuses["general"],
    musicStatus: statuses["music"],
    loading 
  };
}
