"use client";

import { useEffect, useState, useMemo } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKEvent, NDKSubscriptionCacheUsage, NDKKind } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";

export interface CustomEmoji {
  shortcode: string;
  url: string;
}

export function useEmojis() {
  const { ndk, isReady } = useNDK();
  const { user } = useAuthStore();
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || !user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchEmojis = async () => {
      try {
        // Fetch User's emoji list (Kind 10030), User's sets (Kind 30030), 
        // and the specific featured set provided.
        const filters = [
          { 
            kinds: [10030 as NDKKind, 30030 as NDKKind], 
            authors: [user.pubkey] 
          },
          { 
            ids: ["8d87e3ae547a3302b50f85e23b7a147615671fde72ede324804ab90ba4f40efc"] 
          }
        ];

        const events = await ndk.fetchEvents(
          filters,
          { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
        );

        const emojiMap = new Map<string, string>();

        events.forEach(event => {
          event.tags.forEach(tag => {
            if (tag[0] === "emoji" && tag[1] && tag[2]) {
              emojiMap.set(tag[1], tag[2]);
            }
          });
        });

        if (isMounted) {
          const emojiList = Array.from(emojiMap.entries()).map(([shortcode, url]) => ({
            shortcode,
            url
          }));
          setEmojis(emojiList);
        }
      } catch (err) {
        console.error("Error fetching emojis:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEmojis();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, user]);

  const emojiMap = useMemo(() => {
    const map = new Map<string, string>();
    emojis.forEach(e => map.set(e.shortcode, e.url));
    return map;
  }, [emojis]);

  return { emojis, emojiMap, loading };
}
