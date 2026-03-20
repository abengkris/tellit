import { useEffect, useState } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";

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
              
              // NIP-65: If marker is omitted, it's both read and write
              return {
                url,
                read: !marker || marker === "read",
                write: !marker || marker === "write",
              };
            });
          
          setRelays(relayData);
          
          // NIP-65: When downloading events FROM a user, clients SHOULD use the write relays
          relayData.forEach(r => {
            if (r.write) {
              ndk.addExplicitRelay(r.url, undefined, true);
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

/**
 * Hook to fetch NIP-37 Relay List for Private Content (Kind 10013).
 */
export function usePrivateRelayList(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [relays, setRelays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey || !ndk.signer) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchPrivateRelayList = async () => {
      try {
        const user = ndk.getUser({ pubkey });
        const event = await ndk.fetchEvent(
          { kinds: [10013], authors: [pubkey] },
          { 
            groupable: true, 
            cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST 
          }
        );

        if (isMounted && event && event.content) {
          try {
            const decrypted = await ndk.signer?.decrypt(user, event.content, "nip44");
            if (decrypted) {
              const tags = JSON.parse(decrypted);
              const privateRelays = tags
                .filter((t: string[]) => t[0] === 'relay')
                .map((t: string[]) => t[1]);
              
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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPrivateRelayList();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, pubkey]);

  return { relays, loading };
}
