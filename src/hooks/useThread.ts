"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { NDKEvent, NDKFilter, NDKRelaySet, eventIsReply, getRootEventId } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";

export function useThread(focalId?: string, hintRelays?: string[]) {
  const { ndk, isReady } = useNDK();
  const [focalPost, setFocalPost] = useState<NDKEvent | null>(null);
  const [ancestors, setAncestors] = useState<NDKEvent[]>([]);
  const [replies, setReplies] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);
  const oldestReplyTimestampRef = useRef<number | undefined>(undefined);

  const relaySet = useMemo(() => {
    if (!ndk || !hintRelays || hintRelays.length === 0) return undefined;
    try {
      return NDKRelaySet.fromRelayUrls(hintRelays, ndk);
    } catch (e) {
      return undefined;
    }
  }, [ndk, hintRelays]);

  const fetchMoreReplies = useCallback(async (isLoadMore = false, targetId = focalId) => {
    if (!ndk || !targetId) return;

    setLoadingReplies(true);
    try {
      const filter: NDKFilter = {
        kinds: [1, 1111],
        "#e": [targetId],
        limit: 20,
      };

      if (isLoadMore && oldestReplyTimestampRef.current) {
        filter.until = oldestReplyTimestampRef.current - 1;
      }

      const replyEvents = await ndk.fetchEvents(filter, undefined, relaySet);
      const directReplies = Array.from(replyEvents)
        .filter(ev => {
          // Use NDK's eventIsReply utility
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const baseEvent = focalPost || new NDKEvent(ndk, { id: targetId } as any);
          return eventIsReply(baseEvent, ev);
        })
        .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));

      setReplies((prev) => {
        const combined = isLoadMore ? [...prev, ...directReplies] : directReplies;
        if (combined.length > 0) {
          oldestReplyTimestampRef.current = combined[combined.length - 1].created_at;
        }
        return combined;
      });

      setHasMoreReplies(replyEvents.size >= 20);
    } catch (err) {
      console.error("Error fetching replies:", err);
    } finally {
      setLoadingReplies(false);
    }
  }, [ndk, focalId, relaySet, focalPost]);

  const fetchThread = useCallback(async () => {
    if (!ndk || !isReady || !focalId) return;

    setLoading(true);
    try {
      // 1. Fetch the focal post
      const focal = await ndk.fetchEvent(focalId, undefined, relaySet);
      if (!focal) {
        setLoading(false);
        return;
      }
      setFocalPost(focal);

      // 2. Identify and Batch Fetch Ancestors
      const rootId = getRootEventId(focal);
      const replyId = focal.tags.find(t => t[0] === 'e' && t[3] === 'reply')?.[1];
      
      // Fallback for replyId if marker is missing
      let fallbackReplyId: string | undefined;
      if (!replyId) {
        const eTags = focal.tags.filter(t => t[0] === 'e');
        if (eTags.length > 0) {
          fallbackReplyId = eTags[eTags.length - 1][1];
          if (fallbackReplyId === rootId) fallbackReplyId = undefined;
        }
      }

      const idsToFetch = Array.from(new Set([rootId, replyId, fallbackReplyId].filter(Boolean) as string[]));
      
      if (idsToFetch.length > 0) {
        const ancestorEvents = await ndk.fetchEvents({ ids: idsToFetch }, undefined, relaySet);
        const sortedAncestors = Array.from(ancestorEvents).sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
        setAncestors(sortedAncestors);
      } else {
        setAncestors([]);
      }

      // 3. Initial Fetch Direct Replies
      await fetchMoreReplies(false, focalId);
    } catch (err) {
      console.error("Thread fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, focalId, fetchMoreReplies, relaySet]);

  useEffect(() => {
    // Only reset state if the focalId actually changed to prevent flickering
    setFocalPost(null);
    setAncestors([]);
    setReplies([]);
    oldestReplyTimestampRef.current = undefined;
    
    fetchThread();
  }, [focalId, fetchThread]);

  const loadMoreReplies = () => {
    if (!loadingReplies && hasMoreReplies) {
      fetchMoreReplies(true);
    }
  };

  const fetchRepliesFor = useCallback(async (eventId: string) => {
    if (!ndk) return [];
    try {
      const events = await ndk.fetchEvents({
        kinds: [1, 1111],
        "#e": [eventId],
        limit: 10
      }, undefined, relaySet);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseEvent = new NDKEvent(ndk, { id: eventId } as any);

      return Array.from(events)
        .filter(ev => eventIsReply(baseEvent, ev))
        .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
    } catch (e) {
      console.error("Error fetching nested replies:", e);
      return [];
    }
  }, [ndk, relaySet]);

  return { focalPost, ancestors, replies, loading, loadingReplies, hasMoreReplies, loadMoreReplies, fetchRepliesFor };
}
