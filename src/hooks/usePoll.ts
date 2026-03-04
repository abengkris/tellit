"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { NDKEvent, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useNDK } from "./useNDK";
import { useAuthStore } from "@/store/auth";
import { respondToPoll } from "@/lib/actions/poll";

interface PollResults {
  [optionId: string]: number;
}

export function usePoll(pollEvent: NDKEvent) {
  const { ndk, isReady } = useNDK();
  const { user } = useAuthStore();
  const [responses, setResponses] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number | undefined>(undefined);

  // Update clock every minute to keep hasEnded fresh without impure render calls
  useEffect(() => {
    // Avoid synchronous setState in effect initialization
    const timer = setTimeout(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 0);
    
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 60000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Extract poll configuration from tags
  const config = useMemo(() => {
    const options = pollEvent.tags
      .filter(t => t[0] === "option")
      .map(t => ({ id: t[1], label: t[2] }));
    
    const pollType = pollEvent.tags.find(t => t[0] === "polltype")?.[1] || "singlechoice";
    const endsAt = parseInt(pollEvent.tags.find(t => t[0] === "endsAt")?.[1] || "0");
    const relayUrls = pollEvent.tags.filter(t => t[0] === "relay").map(t => t[1]);

    return { options, pollType, endsAt, relayUrls };
  }, [pollEvent]);

  // Fetch responses (Kind 1018)
  useEffect(() => {
    if (!ndk || !isReady || !pollEvent.id) return;

    const subRef = { current: null as NDKSubscription | null };

    const timer = setTimeout(() => {
      setLoading(true);
      
      const newSub = ndk.subscribe(
        { kinds: [1018], "#e": [pollEvent.id] },
        { closeOnEose: false }
      );
      subRef.current = newSub;

      newSub.on("event", (event: NDKEvent) => {
        setResponses(prev => {
          const existingIndex = prev.findIndex(r => r.pubkey === event.pubkey);
          if (existingIndex !== -1) {
            if ((event.created_at ?? 0) > (prev[existingIndex].created_at ?? 0)) {
              const next = [...prev];
              next[existingIndex] = event;
              return next;
            }
            return prev;
          }
          return [...prev, event];
        });
      });

      newSub.on("eose", () => setLoading(false));
    }, 0);

    return () => {
      clearTimeout(timer);
      if (subRef.current) subRef.current.stop();
    };
  }, [ndk, isReady, pollEvent.id]);

  // Calculate results
  const results = useMemo(() => {
    const counts: PollResults = {};
    config.options.forEach(opt => counts[opt.id] = 0);

    responses.forEach(resp => {
      const selectedOptions = resp.tags
        .filter(t => t[0] === "response")
        .map(t => t[1]);

      if (config.pollType === "singlechoice") {
        // NIP-88: Only first response tag counts for singlechoice
        if (selectedOptions.length > 0 && counts[selectedOptions[0]] !== undefined) {
          counts[selectedOptions[0]]++;
        }
      } else {
        // multiplechoice: All unique tags count
        const unique = [...new Set(selectedOptions)];
        unique.forEach(id => {
          if (counts[id] !== undefined) counts[id]++;
        });
      }
    });

    return counts;
  }, [responses, config]);

  const totalVotes = responses.length;

  // Check if current user has voted
  const userVote = useMemo(() => {
    if (!user) return null;
    const resp = responses.find(r => r.pubkey === user.pubkey);
    if (!resp) return null;
    return resp.tags.filter(t => t[0] === "response").map(t => t[1]);
  }, [responses, user]);

  const vote = useCallback(async (optionIds: string[]) => {
    if (!ndk || !isReady || !user) return;
    
    // Validate poll hasn't ended
    if (config.endsAt > 0 && Math.floor(Date.now() / 1000) > config.endsAt) {
      throw new Error("Poll has ended");
    }

    return respondToPoll(ndk, pollEvent, optionIds);
  }, [ndk, isReady, user, pollEvent, config.endsAt]);

  const hasEnded = config.endsAt > 0 && now !== undefined && now > config.endsAt;

  return {
    config,
    results,
    totalVotes,
    userVote,
    loading,
    vote,
    hasEnded
  };
}
