"use client";

import { useState, useEffect, useRef } from "react";
import { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
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
}

/**
 * Hook to fetch and aggregate all statistics for a post.
 */
export function usePostStats(eventId?: string) {
  const { ndk, isReady } = useNDK();
  const { publicKey } = useAuthStore();
  const [stats, setStats] = useState<PostStats>({
    likes: 0,
    reposts: 0,
    comments: 0,
    quotes: 0,
    bookmarks: 0,
    totalSats: 0,
    userLiked: false,
    userReposted: false,
  });

  const seenEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ndk || !isReady || !eventId) return;

    // Reset stats when eventId changes
    setStats({
      likes: 0,
      reposts: 0,
      comments: 0,
      quotes: 0,
      bookmarks: 0,
      totalSats: 0,
      userLiked: false,
      userReposted: false,
    });
    seenEvents.current.clear();

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
          } catch (e) {
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

    const sub = ndk.subscribe(filter, { 
      closeOnEose: false,
      groupable: true,
      groupableDelay: 250 // Wait a bit longer to batch more cards together
    });

    sub.on("event", handleEvent);

    return () => sub.stop();
  }, [ndk, isReady, eventId, publicKey]);

  return stats;
}
