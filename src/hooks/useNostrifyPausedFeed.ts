"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type NostrEvent } from "@nostrify/types";
import { useNostrifyFeed, UseNostrifyFeedOptions } from "./useNostrifyFeed";

interface UseNostrifyPausedFeedReturn {
  posts: NostrEvent[];            
  newCount: number;             
  isLoading: boolean;
  flushNewPosts: () => void;    
  loadMore: () => void;         
  hasMore: boolean;
  refresh: () => void;
}

/**
 * Wrapper around useNostrifyFeed that adds "pausing" functionality.
 * New events are buffered until flushNewPosts is called.
 */
export function useNostrifyPausedFeed(options: UseNostrifyFeedOptions = {}): UseNostrifyPausedFeedReturn {
  const { posts: allPosts, loading, hasMore, loadMore, refresh } = useNostrifyFeed(options);
  const [visiblePosts, setVisiblePosts] = useState<NostrEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const isInitialLoadDone = useRef(false);

  // Sync initial posts or paginated posts
  useEffect(() => {
    if (!loading && !isInitialLoadDone.current) {
      Promise.resolve().then(() => setVisiblePosts(allPosts));
      isInitialLoadDone.current = true;
    } else if (isInitialLoadDone.current) {
      const visibleIds = new Set(visiblePosts.map(p => p.id));
      const news = allPosts.filter(p => !visibleIds.has(p.id));

      const oldestVisible = visiblePosts.length > 0 ? visiblePosts[visiblePosts.length - 1].created_at ?? 0 : 0;
      const paginated = news.filter(p => (p.created_at ?? 0) <= oldestVisible);
      const trulyNew = news.filter(p => (p.created_at ?? 0) > oldestVisible);

      if (paginated.length > 0) {
        Promise.resolve().then(() => {
          setVisiblePosts(prev => {
            const combined = [...prev, ...paginated];
            const unique = Array.from(new Map(combined.map(p => [p.id, p])).values())
              .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));

            if (unique.length === prev.length) return prev;
            return unique as NostrEvent[];
          });
        });
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewCount(prev => {
        return prev === trulyNew.length ? prev : trulyNew.length;
      });
    }
  }, [allPosts, loading, visiblePosts]);


  const flushNewPosts = useCallback(() => {
    setVisiblePosts(allPosts);
    setNewCount(0);
  }, [allPosts]);

  return {
    posts: visiblePosts,
    newCount,
    isLoading: loading,
    flushNewPosts,
    loadMore,
    hasMore,
    refresh,
  };
}
