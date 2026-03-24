import { useEffect, useState, useRef, useCallback } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKSubscriptionCacheUsage, NDKKind } from "@nostr-dev-kit/ndk";

export interface RelayMetadata {
  url: string;
  read: boolean;
  write: boolean;
}

// Global cache for relay lists to avoid repeat fetches in the same session
const globalRelayCache = new Map<string, RelayMetadata[]>();
const globalPrivateRelayCache = new Map<string, string[]>();

export function useRelayList(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [relays, setRelays] = useState<RelayMetadata[]>(pubkey ? (globalRelayCache.get(pubkey) || []) : []);
  const [loading, setLoading] = useState(false);
  const lastFetchedPubkey = useRef<string | undefined>(undefined);

  const fetchRelayList = useCallback(async (forceRelay = false) => {
    if (!ndk || !isReady || !pubkey) return;

    setLoading(true);
    lastFetchedPubkey.current = pubkey;

    try {
      // 1. Try Cache-Only first
      if (!relays.length && !forceRelay) {
        const cachedEvent = await ndk.fetchEvent(
          { kinds: [10002], authors: [pubkey] },
          { cacheUsage: NDKSubscriptionCacheUsage.ONLY_CACHE }
        );

        if (cachedEvent) {
          const relayData: RelayMetadata[] = cachedEvent.tags
            .filter((tag) => tag[0] === "r" && tag[1])
            .map((tag) => {
              const url = tag[1];
              const marker = tag[2]; // undefined, "read", or "write"
              return {
                url,
                read: !marker || marker === "read",
                write: !marker || marker === "write",
              };
            });
          
          globalRelayCache.set(pubkey, relayData);
          setRelays(relayData);
          setLoading(false);
        }
      }

      // 2. Fetch from Relays
      const event = await ndk.fetchEvent(
        { kinds: [10002], authors: [pubkey] },
        { 
          cacheUsage: forceRelay ? NDKSubscriptionCacheUsage.ONLY_RELAY : NDKSubscriptionCacheUsage.CACHE_FIRST,
          relayGoalPerAuthor: 3 
        }
      );

      if (event) {
        const relayData: RelayMetadata[] = event.tags
          .filter((tag) => tag[0] === "r" && tag[1])
          .map((tag) => {
            const url = tag[1];
            const marker = tag[2];
            return {
              url,
              read: !marker || marker === "read",
              write: !marker || marker === "write",
            };
          });
        
        globalRelayCache.set(pubkey, relayData);
        setRelays(relayData);
        
        // NIP-65: Ensure we connect to write relays for fetching user content
        relayData.forEach(r => {
          if (r.write) {
            ndk.addExplicitRelay(r.url, undefined, true);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching relay list for", pubkey, error);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, pubkey, relays.length]);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setRelays([]);
      setLoading(false);
      return;
    }

    const cached = globalRelayCache.get(pubkey);
    if (cached) {
      setRelays(cached);
      if (lastFetchedPubkey.current === pubkey) return;
    }

    fetchRelayList();
  }, [ndk, isReady, pubkey, fetchRelayList]);

  return { relays, loading, refresh: () => fetchRelayList(true) };
}

/**
 * Hook to fetch NIP-37 Relay List for Private Content (Kind 10013).
 */
export function usePrivateRelayList(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [relays, setRelays] = useState<string[]>(pubkey ? (globalPrivateRelayCache.get(pubkey) || []) : []);
  const [loading, setLoading] = useState(false);
  const lastFetchedPubkey = useRef<string | undefined>(undefined);

  const fetchPrivateRelayList = useCallback(async (forceRelay = false) => {
    if (!ndk || !isReady || !pubkey || !ndk.signer) return;

    setLoading(true);
    lastFetchedPubkey.current = pubkey;

    try {
      const user = ndk.getUser({ pubkey });
      const event = await ndk.fetchEvent(
        { kinds: [10013 as NDKKind], authors: [pubkey] },
        { 
          cacheUsage: forceRelay ? NDKSubscriptionCacheUsage.ONLY_RELAY : NDKSubscriptionCacheUsage.CACHE_FIRST,
          groupable: true 
        }
      );

      if (event && event.content) {
        try {
          const decrypted = await ndk.signer?.decrypt(user, event.content, "nip44");
          if (decrypted) {
            const tags = JSON.parse(decrypted);
            const privateRelays = tags
              .filter((t: string[]) => t[0] === 'relay')
              .map((t: string[]) => t[1]);
            
            globalPrivateRelayCache.set(pubkey, privateRelays);
            setRelays(privateRelays);
            
            // Ensure we connect to these for private data
            privateRelays.forEach((url: string) => {
              ndk.addExplicitRelay(url, undefined, true);
            });
          }
        } catch (e) {
          console.warn("Failed to decrypt private relay list:", e);
        }
      }
    } catch (error) {
      console.error("Error fetching private relay list for", pubkey, error);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, pubkey]);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setRelays([]);
      setLoading(false);
      return;
    }

    const cached = globalPrivateRelayCache.get(pubkey);
    if (cached) {
      setRelays(cached);
      if (lastFetchedPubkey.current === pubkey) return;
    }

    fetchPrivateRelayList();
  }, [ndk, isReady, pubkey, fetchPrivateRelayList]);

  return { relays, loading, refresh: () => fetchPrivateRelayList(true) };
}
