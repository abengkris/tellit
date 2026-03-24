"use client";

import { useState, useEffect, useRef } from "react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";

export interface PostStats {
  likes: number;
  reposts: number;
  comments: number;
  quotes: number;
  bookmarks: number;
  totalSats: number;
  userLiked: boolean;
  userReposted: boolean;
  combinedReposts: number;
}

const INITIAL_STATS: PostStats = {
  likes: 0,
  reposts: 0,
  comments: 0,
  quotes: 0,
  bookmarks: 0,
  totalSats: 0,
  userLiked: false,
  userReposted: false,
  combinedReposts: 0,
};

/**
 * Hook to fetch and aggregate all statistics for a post.
 */
export function usePostStats(eventId?: string) {
  const { ndk, isReady } = useNDK();
  const { publicKey } = useAuthStore();
  
  // Initialize with INITIAL_STATS
  const [stats, setStats] = useState<PostStats>(INITIAL_STATS);

  const seenEvents = useRef<Set<string>>(new Set());
  const lastEventId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!ndk || !isReady || !eventId) return;

    // Manual reset if eventId changed since last effect run
    // This avoids one extra render compared to always calling it at the start of effect
    if (lastEventId.current !== eventId) {
      Promise.resolve().then(() => setStats(INITIAL_STATS));
      seenEvents.current.clear();
      lastEventId.current = eventId;
    }

    const filter: NDKFilter = {
      kinds: [1, 6, 7, 16, 1111, 9735, 10003],
      "#e": [eventId],
    };

    const handleEvent = (event: NDKEvent) => {
      if (seenEvents.current.has(event.id)) return;
      seenEvents.current.add(event.id);

      setStats((prev) => {
        const newStats = { ...prev };
        const isMe = publicKey && event.pubkey === publicKey;

        // 1. Reactions (Likes)
        if (event.kind === 7) {
          if (event.content === "+" || event.content === "") {
            newStats.likes++;
            if (isMe) newStats.userLiked = true;
          }
        } 
        // 2. Reposts (6, 16)
        else if (event.kind === 6 || event.kind === 16) {
          newStats.reposts++;
          newStats.combinedReposts++;
          if (isMe) newStats.userReposted = true;
        }
        // 3. Comments (1, 1111)
        else if (event.kind === 1 || event.kind === 1111) {
          const isReply = event.tags.some(t => t[0] === 'e' && t[1] === eventId && (t[3] === 'reply' || !t[3]));
          if (isReply) {
            newStats.comments++;
          } else {
            // Probably a quote if it's kind 1 but not a direct reply
            newStats.quotes++;
            newStats.combinedReposts++;
          }
        }
        // 4. Zaps
        else if (event.kind === 9735) {
          try {
            const description = event.tags.find(t => t[0] === 'description')?.[1];
            if (description) {
              const zapRequest = JSON.parse(description);
              const amountTag = zapRequest.tags.find((t: string[]) => t[0] === 'amount');
              if (amountTag) {
                newStats.totalSats += Math.floor(parseInt(amountTag[1]) / 1000);
              }
            }
          } catch (_) {
            // Ignore parse errors
          }
        }
        // 5. Bookmarks
        else if (event.kind === 10003) {
          newStats.bookmarks++;
        }

        return newStats;
      });
    };

    const sub = ndk.subscribe(
      filter, 
      { 
        closeOnEose: false,
        groupable: true,
        groupableDelay: 250
      },
      {
        onEvents: (events: NDKEvent[]) => {
          setStats((prev) => {
            const newStats = { ...prev };
            for (const event of events) {
              if (seenEvents.current.has(event.id)) continue;
              seenEvents.current.add(event.id);
              const isMe = publicKey && event.pubkey === publicKey;

              // 1. Reactions (Likes)
              if (event.kind === 7) {
                if (event.content === "+" || event.content === "") {
                  newStats.likes++;
                  if (isMe) newStats.userLiked = true;
                }
              } 
              // 2. Reposts (6, 16)
              else if (event.kind === 6 || event.kind === 16) {
                newStats.reposts++;
                newStats.combinedReposts++;
                if (isMe) newStats.userReposted = true;
              }
              // 3. Comments (1, 1111)
              else if (event.kind === 1 || event.kind === 1111) {
                const isReply = event.tags.some(t => t[0] === 'e' && t[1] === eventId && (t[3] === 'reply' || !t[3]));
                if (isReply) {
                  newStats.comments++;
                } else {
                  newStats.quotes++;
                  newStats.combinedReposts++;
                }
              }
              // 4. Zaps
              else if (event.kind === 9735) {
                try {
                  const description = event.tags.find(t => t[0] === "description")?.[1];
                  if (description) {
                    const zapRequest = JSON.parse(description);
                    const amountTag = zapRequest.tags.find((t: string[]) => t[0] === "amount");
                    if (amountTag) {
                      newStats.totalSats += Math.floor(parseInt(amountTag[1]) / 1000);
                    }
                  }
                } catch { /* ignore */ }
              }
              // 5. Bookmarks
              else if (event.kind === 10003) {
                newStats.bookmarks++;
              }
            }
            return newStats;
          });
        },
        onEvent: handleEvent
      }
    );

    return () => sub.stop();
  }, [ndk, isReady, eventId, publicKey]);

  return stats;
}
