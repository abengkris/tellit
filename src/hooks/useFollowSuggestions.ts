"use client";

import { useState, useEffect } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";

interface Suggestion {
  pubkey: string;
  followedByCount: number;
}

export function useFollowSuggestions(limit: number = 5) {
  const { isReady } = useNDK();
  const { publicKey: currentPubkey } = useAuthStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !currentPubkey) return;

    let isMounted = true;
    
    const fetchFromAPI = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/wot/suggestions?pubkey=${currentPubkey}&limit=${limit}`);
        const data = await res.json();
        
        if (isMounted && data.suggestions) {
          setSuggestions(data.suggestions);
        }
      } catch (err) {
        console.error("Error fetching WoT suggestions:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFromAPI();

    return () => {
      isMounted = false;
    };
  }, [isReady, currentPubkey, limit]);

  return { suggestions, loading };
}
