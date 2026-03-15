import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";

const NOSTR_WINE_API_URL = "https://api.nostr.wine/search";
const RESULTS_PER_PAGE = 20;

export function useSearch(query: string) {
  const { ndk, isReady } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [profiles, setProfiles] = useState<NDKUser[]>([]);
  const [directResult, setDirectResult] = useState<{
    user?: NDKUser;
    event?: NDKEvent;
  }>({});
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  const performSearch = useCallback(async (isLoadMore = false) => {
    if (!ndk || !isReady || !query || query.length < 2) {
      if (!isLoadMore) {
        setPosts([]);
        setProfiles([]);
        setDirectResult({});
      }
      return;
    }

    setLoading(true);

    try {
      if (!isLoadMore) {
        setDirectResult({});
        pageRef.current = 1;
        
        // 0. Check if query is NIP-19, hex ID, or NIP-05
        const isHex = /^[0-9a-fA-F]{64}$/.test(query);
        const isNip19 = query.startsWith("npub") || query.startsWith("nprofile") || 
                        query.startsWith("note") || query.startsWith("nevent") || 
                        query.startsWith("naddr");
        const isNip05 = query.includes("@") || query.includes(".");

        if (isNip19 || isHex || isNip05) {
          if (query.startsWith("npub") || query.startsWith("nprofile") || isNip05 || (isHex && !query.startsWith("note"))) {
            try {
              const user = await ndk.fetchUser(query);
              if (user) {
                await user.fetchProfile();
                setDirectResult({ user });
              }
            } catch (e) {
              console.warn("Failed to fetch user direct result", e);
            }
          } 
          
          if (!directResult.user && (query.startsWith("note") || query.startsWith("nevent") || query.startsWith("naddr") || isHex)) {
            try {
              const event = await ndk.fetchEvent(query);
              if (event) setDirectResult({ event });
            } catch (e) {
              console.warn("Failed to fetch event direct result", e);
            }
          }
        }

        // 1. Search Profiles (kind:0) from api.nostr.wine
        const profileUrl = `${NOSTR_WINE_API_URL}?query=${encodeURIComponent(query)}&kind=0&limit=15&sort=relevance`;
        const profileResponse = await fetch(profileUrl);
        if (profileResponse.ok) {
          const result = await profileResponse.json();
          const foundProfiles = (result.data || []).map((rawEvent: { pubkey: string; content: string }) => {
            const user = ndk.getUser({ pubkey: rawEvent.pubkey });
            try {
              user.profile = JSON.parse(rawEvent.content);
            } catch {
              // content might not be valid JSON
            }
            return user;
          });
          
          if (directResult.user) {
            const exists = foundProfiles.some((p: NDKUser) => p.pubkey === directResult.user?.pubkey);
            if (!exists) foundProfiles.unshift(directResult.user);
          }
          setProfiles(foundProfiles);
        }
      }

      // 2. Search Posts (kind:1) and Articles (kind:30023)
      const page = isLoadMore ? pageRef.current + 1 : 1;
      const kinds = "1,30023"; // Search for posts and long-form articles
      const url = `${NOSTR_WINE_API_URL}?query=${encodeURIComponent(query)}&kind=${kinds}&limit=${RESULTS_PER_PAGE}&page=${page}&sort=relevance`;
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        const rawEvents = (result.data || []) as { id: string; pubkey: string; content: string; created_at: number; kind: number; tags: string[][]; sig: string }[];
        const newPostsList = rawEvents.map((raw) => new NDKEvent(ndk, raw));
        
        setPosts((prev) => {
          let combined = isLoadMore ? [...prev, ...newPostsList] : newPostsList;
          
          if (!isLoadMore && directResult.event) {
            const exists = combined.some(p => p.id === directResult.event?.id);
            if (!exists) combined = [directResult.event, ...combined];
          }

          const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          return unique;
        });

        setHasMore(!result.pagination?.last_page);
        if (isLoadMore) pageRef.current = page;
      }

    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, query, directResult.user, directResult.event]);

  useEffect(() => {
    setHasMore(true);
    const timeout = setTimeout(() => performSearch(), 500); // Debounce
    return () => clearTimeout(timeout);
  }, [query, performSearch]);

  const loadMore = () => {
    if (!loading && hasMore) {
      performSearch(true);
    }
  };

  return { posts, profiles, loading, loadMore, hasMore, directResult };
}
