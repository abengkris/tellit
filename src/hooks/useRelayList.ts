import { useEffect, useState } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKEvent, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";

export interface RelayMetadata {
  url: string;
  read: boolean;
  write: boolean;
}

export function useRelayList(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [relays, setRelays] = useState<RelayMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchRelayList = async () => {
      try {
        // Fetch kind 10002 (Relay List Metadata)
        const event = await ndk.fetchEvent(
          { kinds: [10002], authors: [pubkey] },
          { 
            groupable: true, 
            cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST 
          }
        );

        if (isMounted && event) {
          const relayData: RelayMetadata[] = event.tags
            .filter((tag) => tag[0] === "r")
            .map((tag) => {
              const url = tag[1];
              const marker = tag[2]; // undefined, "read", or "write"
              
              return {
                url,
                read: !marker || marker === "read",
                write: !marker || marker === "write",
              };
            });
          
          setRelays(relayData);
          
          // Enforce Outbox Model (NIP-65)
          // We must connect to the user's write relays to ensure our events reach their audience
          relayData.forEach(r => {
            if (r.write) {
              ndk.addExplicitRelay(r.url, undefined, true); // true = connect immediately
            }
          });
        }
      } catch (error) {
        console.error("Error fetching relay list for", pubkey, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRelayList();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, pubkey]);

  return { relays, loading };
}
