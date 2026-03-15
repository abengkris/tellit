import { useEffect, useState } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKEvent, NDKSubscriptionCacheUsage, NDKKind } from "@nostr-dev-kit/ndk";

export interface UserStatus {
  content: string;
  type: string; // "general", "music", etc.
  link?: string;
  expiration?: number;
}

export function useUserStatus(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    let isMounted = true;
    Promise.resolve().then(() => setLoading(true));

    // Subscribe to kind 30315 (User Status)
    const sub = ndk.subscribe(
      { kinds: [30315 as NDKKind], authors: [pubkey] },
      { 
        closeOnEose: false, 
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST 
      },
      {
        onEvent: (event: NDKEvent) => {
          if (!isMounted) return;

          const dTag = event.tags.find(t => t[0] === 'd');
          if (!dTag) return;

          const type = dTag[1];
          const expirationTag = event.tags.find(t => t[0] === 'expiration');
          const rTag = event.tags.find(t => t[0] === 'r');

          const expiration = expirationTag ? parseInt(expirationTag[1]) : undefined;
          
          // Filter out expired statuses
          if (expiration && expiration < Math.floor(Date.now() / 1000)) {
            return;
          }

          setStatuses(prev => ({
            ...prev,
            [type]: {
              content: event.content,
              type,
              link: rTag ? rTag[1] : undefined,
              expiration
            }
          }));
        },
        onEose: () => {
          if (isMounted) setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      sub.stop();
    };
  }, [ndk, isReady, pubkey]);

  return { 
    statuses, 
    generalStatus: statuses["general"],
    musicStatus: statuses["music"],
    loading 
  };
}
