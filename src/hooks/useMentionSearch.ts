"use client";

import { useState, useEffect, useCallback } from "react";
import { useNDK } from "./useNDK";
import { NDKUser, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useDebounce } from "use-debounce";

export function useMentionSearch(query: string) {
  const { ndk } = useNDK();
  const [results, setResults] = useState<NDKUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery] = useDebounce(query, 300);

  useEffect(() => {
    if (!ndk || !debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const searchUsers = async () => {
      try {
        // NIP-50 search
        const users = await ndk.fetchUsers({ search: debouncedQuery, limit: 5 });
        if (isMounted) {
          setResults(Array.from(users));
        }
      } catch (err) {
        console.error("Mention search failed:", err);
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
