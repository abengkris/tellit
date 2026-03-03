"use client";

import { useEffect, useState } from "react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { useNDK } from "./useNDK";

export function usePinnedPosts(pubkey: string, pinnedIds: Set<string>) {
  const { ndk, isReady } = useNDK();
  const [pinnedPosts, setPinnedPosts] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ndk || !isReady || pinnedIds.size === 0) {
      setPinnedPosts([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchPinned = async () => {
      try {
        const ids = Array.from(pinnedIds);
        // Fetch specific events by ID
        const filter: NDKFilter = { ids };
        const events = await ndk.fetchEvents(filter);
        
        if (isMounted) {
          // Filter to ensure we only show posts from the actual user (security check)
          const validEvents = Array.from(events)
            .filter(e => e.pubkey === pubkey)
            .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
            
          setPinnedPosts(validEvents);
        }
      } catch (err) {
        console.error("Error fetching pinned posts:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPinned();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, pubkey, pinnedIds]);

  return { pinnedPosts, loading };
}
