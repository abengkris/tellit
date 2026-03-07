"use client";

import { useState, useEffect } from "react";

export interface TrendingTag {
  tag: string;
  count: number;
}

/**
 * Hook to fetch trending hashtags from nostr.band API.
 * This is more efficient than client-side aggregation.
 */
export function useTrending() {
  const [trending, setTrending] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTrending() {
      try {
        // Fetch from nostr.band's trending hashtags endpoint
        const response = await fetch("https://api.nostr.band/v0/trending/hashtags");
        if (!response.ok) throw new Error("Failed to fetch trending tags");
        
        const data = await response.json();
        
        if (isMounted && data && data.hashtags) {
          // Map API response to our interface
          const mapped: TrendingTag[] = data.hashtags.slice(0, 5).map((item: { hashtag: string; posts: number }) => ({
            tag: item.hashtag,
            count: item.posts
          }));
          
          setTrending(mapped);
        }
      } catch (err) {
        console.error("Error fetching trending tags:", err);
        if (isMounted) setError("Could not load trends");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTrending();

    return () => {
      isMounted = false;
    };
  }, []);

  return { trending, loading, error };
}
