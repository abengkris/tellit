"use client";

import { useState, useEffect, useRef } from "react";
import { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";

export interface PostStats {
  likes: number;
  reposts: number;
  comments: number;
  quotes: number;
  bookmarks: number;
  totalSats: number;
  zapCount: number;
  userLiked: boolean;
  userReposted: boolean;
}

/**
 * Hook to fetch and aggregate all statistics for a post.
 */
export function usePostStats(eventId?: string) {
  const { ndk, isReady } = useNDK();
  const [stats, setStats] = useState<PostStats>({
    likes: 0,
    reposts: 0,
    comments: 0,
    quotes: 0,
    bookmarks: 0,
    totalSats: 0,
    zapCount: 0,
    userLiked: false,
    userReposted: false,
  });

  // Track event IDs to avoid double counting during live subscription
  const seenEvents = useRef(new Set<string>());

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
      zapCount: 0,
      userLiked: false,
      userReposted: false,
    });
    seenEvents.current.clear();

    const filter: NDKFilter = {
      kinds: [1, 6, 7, 9735, 10003, 1111],
      "#e": [eventId],
    };

    const sub = ndk.subscribe(
      filter,
      { 
        closeOnEose: false, 
        groupableDelay: 500,
        groupableDelayType: "at-most",
      }
    );

    const handleEvent = (event: NDKEvent) => {
      if (seenEvents.current.has(event.id)) return;
      seenEvents.current.add(event.id);

      setStats((prev) => {
        const newStats = { ...prev };
        const isMe = ndk.signer && event.pubkey === (ndk.signer as any).user?.pubkey;

        // 1. Reactions (Likes)
        if (event.kind === 7) {
          if (event.content === "+" || event.content === "") {
            newStats.likes++;
            if (isMe) newStats.userLiked = true;
          }
        } 
        
        // 2. Reposts
        else if (event.kind === 6) {
          newStats.reposts++;
          if (isMe) newStats.userReposted = true;
        } 
        
        // 3. Comments (Replies) and Quotes
        else if (event.kind === 1 || event.kind === 1111) {
          const eTags = event.tags.filter(t => t[0] === 'e');
          const isReply = event.kind === 1111 || 
                          event.tags.some(t => t[0] === 'e' && (t[3] === 'reply' || t[3] === 'root')) || 
                          eTags[eTags.length - 1]?.[1] === eventId;
          
          const isQuote = event.kind === 1 && (
                          event.tags.some(t => t[0] === 'e' && t[1] === eventId && t[3] === 'mention') ||
                          (event.content.includes(`nostr:${eventId}`) && !isReply)
          );

          if (isReply) {
            newStats.comments++;
          } else if (isQuote) {
            newStats.quotes++;
          }
        } 
        
        // 4. Zaps
        else if (event.kind === 9735) {
          newStats.zapCount++;
          const descriptionTag = event.tags.find(t => t[0] === "description");
          if (descriptionTag) {
            try {
              const zapRequest = JSON.parse(descriptionTag[1]);
              const amountTag = zapRequest.tags.find((t: string[]) => t[0] === "amount");
              if (amountTag) {
                const msats = parseInt(amountTag[1]);
                newStats.totalSats += msats / 1000;
              }
            } catch (e) {}
          }
        }

        // 5. Bookmarks
        else if (event.kind === 10003) {
          newStats.bookmarks++;
        }

        return newStats;
      });
    };

    sub.on("event", handleEvent);

    return () => sub.stop();
  }, [ndk, isReady, eventId]);

  return stats;
}
