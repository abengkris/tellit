"use client";

import { useState, useEffect, useRef } from "react";
import { useNDK } from "./useNDK";
import { type NostrFilter } from "@nostrify/types";
import { createRelayPool } from "@/lib/nostrify-relay";
import { DEFAULT_RELAYS } from "@/lib/ndk";
import { useDebounce } from "use-debounce";
import { SimplifiedUser } from "@/components/common/UserRecommendation";
import { toNpub } from "@/lib/utils/nip19";

/**
 * Hook to search for users to mention using Nostrify.
 */
export function useMentionSearch(query: string) {
  const { ndk } = useNDK();
  const [results, setResults] = useState<SimplifiedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery] = useDebounce(query, 300);
  const poolRef = useRef<ReturnType<typeof createRelayPool> | null>(null);

  useEffect(() => {
    if (!ndk || !debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const searchUsers = async () => {
      try {
        if (!poolRef.current) {
          poolRef.current = createRelayPool(DEFAULT_RELAYS);
        }

        const filter: NostrFilter = { 
          kinds: [0], 
          search: debouncedQuery, 
          limit: 5 
        };

        const stream = poolRef.current.req([filter]);
        const foundUsers: SimplifiedUser[] = [];

        for await (const msg of stream) {
          if (!isMounted) break;
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            try {
              const profile = JSON.parse(event.content);
              foundUsers.push({
                pubkey: event.pubkey,
                npub: toNpub(event.pubkey),
                profile: {
                  ...profile,
                  pubkey: event.pubkey
                }
              });
              
              // Update state as we find them for responsiveness
              setResults([...foundUsers]);
            } catch (e) {
              console.warn("[useMentionSearch] Failed to parse profile:", e);
            }
          } else if (msg[0] === 'EOSE') {
            break;
          }
        }
      } catch (err) {
        console.error("[useMentionSearch] search failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    searchUsers();

    return () => {
      isMounted = false;
    };
  }, [ndk, debouncedQuery]);

  return { results, loading };
}
