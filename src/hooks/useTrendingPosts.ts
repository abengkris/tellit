import { useState, useEffect } from "react";
import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";

export interface TrendingPostStats {
  replies: number;
  reposts: number;
  reactions: number;
  zap_amount: number;
  zap_count: number;
}

export interface TrendingPostRaw {
  event_id: string;
  replies: number;
  reposts: number;
  reactions: number;
  zap_amount: number;
  zap_count: number;
}

export function useTrendingPosts(ndk: NDK | null, options: { 
  hours?: number, 
  order?: "replies" | "reposts" | "reactions" | "zap_count" | "zap_amount", 
  limit?: number 
} = {}) {
  const { hours = 24, order = "replies", limit = 10 } = options;
  const [trendingPosts, setTrendingPosts] = useState<NDKEvent[]>([]);
  const [trendingStats, setTrendingStats] = useState<Record<string, TrendingPostRaw>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!ndk) return;

    async function fetchTrending() {
      try {
        setLoading(true);
        // Fetch from nostr.wine trending endpoint
        const url = `https://api.nostr.wine/trending?order=${order}&hours=${hours}&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch trending posts");
        
        const data: TrendingPostRaw[] = await response.json();
        
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const statsMap: Record<string, TrendingPostRaw> = {};
          const ids: string[] = [];
          
          data.forEach(item => {
            statsMap[item.event_id] = item;
            ids.push(item.event_id);
          });
          
          setTrendingStats(statsMap);
          
          // Fetch the actual events from NDK
          const events = ndk ? await ndk.fetchEvents({ ids }) : new Set<NDKEvent>();
          const sortedEvents = Array.from(events).sort((a, b) => {
            return ids.indexOf(a.id) - ids.indexOf(b.id);
          });
          
          if (isMounted) {
            setTrendingPosts(sortedEvents);
          }
        }
      } catch (err) {
        console.error("Error fetching trending posts:", err);
        if (isMounted) setError("Could not load trending posts");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTrending();

    return () => {
      isMounted = false;
    };
  }, [ndk, hours, order, limit]);

  return { trendingPosts, trendingStats, loading, error };
}
