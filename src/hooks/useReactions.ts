"use client";

import { useState, useEffect, useRef } from "react";
import { NDKEvent, NDKFilter, NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";

export interface EventReactions {
  likes: string[];
  reposts: string[];
  zaps: { pubkey: string; amount: number }[];
  loading: boolean;
}

/**
 * Hook to fetch all users who reacted to an event.
 */
export function useReactions(eventId?: string) {
  const { ndk, isReady } = useNDK();
  const [reactions, setReactions] = useState<EventReactions>({
    likes: [],
    reposts: [],
    zaps: [],
    loading: true,
  });

  const seenEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ndk || !isReady || !eventId) {
      Promise.resolve().then(() => setReactions(prev => ({ ...prev, loading: false })));
      return;
    }

    setReactions({ likes: [], reposts: [], zaps: [], loading: true });
    seenEvents.current.clear();

    const filter: NDKFilter = {
      kinds: [6, 7, 16, 17 as NDKKind, 9735],
      "#e": [eventId],
    };

    const handleEvent = (event: NDKEvent) => {
      if (seenEvents.current.has(event.id)) return;
      seenEvents.current.add(event.id);

      setReactions((prev) => {
        const next = { ...prev };

        // 1. Likes (Native NIP-25 and External NIP-73)
        if (event.kind === 7 || event.kind === 17) {
          if ((event.content === "+" || event.content === "") && !next.likes.includes(event.pubkey)) {
            next.likes = [...next.likes, event.pubkey];
          }
        } 
        // 2. Reposts
        else if (event.kind === 6 || event.kind === 16) {
          if (!next.reposts.includes(event.pubkey)) {
            next.reposts = [...next.reposts, event.pubkey];
          }
        }
        // 3. Zaps
        else if (event.kind === 9735) {
          try {
            const description = event.tags.find(t => t[0] === 'description')?.[1];
            if (description) {
              const zapRequest = JSON.parse(description);
              const amountTag = zapRequest.tags.find((t: string[]) => t[0] === 'amount');
              const amount = amountTag ? Math.floor(parseInt(amountTag[1]) / 1000) : 0;
              
              // Use the pubkey from the zap request (the actual zapper)
              const zapperPubkey = zapRequest.pubkey;
              if (zapperPubkey) {
                next.zaps = [...next.zaps, { pubkey: zapperPubkey, amount }];
              }
            }
          } catch {
            // Ignore malformed zaps
          }
        }

        return next;
      });
    };

    const sub = ndk.subscribe(
      filter, 
      { 
        closeOnEose: true,
        groupable: true,
        groupableDelay: 250,
      },
      {
        onEvents: (events: NDKEvent[]) => {
          setReactions((prev) => {
            const next = { ...prev };
            for (const event of events) {
              if (seenEvents.current.has(event.id)) continue;
              seenEvents.current.add(event.id);

              // 1. Likes
              if (event.kind === 7 || event.kind === 17) {
                if ((event.content === "+" || event.content === "") && !next.likes.includes(event.pubkey)) {
                  next.likes = [...next.likes, event.pubkey];
                }
              } 
              // 2. Reposts
              else if (event.kind === 6 || event.kind === 16) {
                if (!next.reposts.includes(event.pubkey)) {
                  next.reposts = [...next.reposts, event.pubkey];
                }
              }
              // 3. Zaps
              else if (event.kind === 9735) {
                try {
                  const description = event.tags.find(t => t[0] === 'description')?.[1];
                  if (description) {
                    const zapRequest = JSON.parse(description);
                    const amountTag = zapRequest.tags.find((t: string[]) => t[0] === 'amount');
                    const amount = amountTag ? Math.floor(parseInt(amountTag[1]) / 1000) : 0;
                    const zapperPubkey = zapRequest.pubkey;
                    if (zapperPubkey) {
                      next.zaps = [...next.zaps, { pubkey: zapperPubkey, amount }];
                    }
                  }
                } catch { /* ignore */ }
              }
            }
            return next;
          });
        },
        onEvent: handleEvent,
        onEose: () => {
          setReactions(prev => ({ ...prev, loading: false }));
        }
      }
    );

    return () => sub.stop();
  }, [ndk, isReady, eventId]);

  return reactions;
}
