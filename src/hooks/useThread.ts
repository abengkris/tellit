"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { NDKEvent, NDKFilter, NDKRelaySet, eventIsReply, getRootEventId, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
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
  const focalPostRef = useRef<NDKEvent | null>(null);
  const lastProcessedId = useRef<string | undefined>(undefined);

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
          // Use the ref to avoid dependency loop
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const baseEvent = focalPostRef.current || new NDKEvent(ndk, { id: targetId } as any);
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
      console.error("[useThread] Error fetching replies:", err);
    } finally {
      setLoadingReplies(false);
    }
  }, [ndk, focalId, relaySet]); // Removed focalPost from dependencies

  const fetchThread = useCallback(async () => {
    if (!ndk || !isReady || !focalId) {
      console.log("[useThread] Skip fetch: ndk/ready/id missing", { hasNdk: !!ndk, isReady, focalId });
      return;
    }

    // Prevent redundant fetches if already loading or loaded for this ID
    if (lastProcessedId.current === focalId && (loading || focalPostRef.current)) {
      console.log("[useThread] Already loading or loaded for", focalId);
      return;
    }

    const relayUrls = relaySet ? Array.from(relaySet.relays).map(r => r.url) : [];
    console.log("[useThread] Starting fetch for", focalId, "with relays:", relayUrls);
    lastProcessedId.current = focalId;
    setLoading(true);
    
    // Safety timeout: stop loading after 10s regardless of result
    const safetyTimeout = setTimeout(() => {
      console.warn("[useThread] Safety timeout reached for", focalId);
      setLoading(false);
    }, 10000);

    try {
      // 1. Fetch the focal post
      console.log("[useThread] Fetching focal event...");
      // Try to get from cache first for speed
      let focal = await ndk.fetchEvent(focalId, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }, relaySet);
      
      if (!focal) {
        // If not in cache, fetch from relays
        focal = await ndk.fetchEvent(focalId, undefined, relaySet);
      }

      if (!focal) {
        console.warn("[useThread] Focal event not found on relays or cache", focalId);
        setLoading(false);
        clearTimeout(safetyTimeout);
        return;
      }
      
      console.log("[useThread] Focal event found:", focal.id);
      focalPostRef.current = focal;
      setFocalPost(focal);

      // 2. Identify and Batch Fetch Ancestors
      const rootId = getRootEventId(focal);
      const eTags = focal.tags.filter(t => t[0] === 'e');
      const replyId = focal.tags.find(t => t[0] === 'e' && t[3] === 'reply')?.[1] || 
                      (eTags.length > 0 ? eTags[eTags.length - 1][1] : undefined);
      
      const idsToFetch = Array.from(new Set([rootId, replyId].filter(Boolean) as string[]));
      console.log("[useThread] Ancestor IDs to fetch:", idsToFetch);
      
      if (idsToFetch.length > 0) {
        const ancestorEvents = await ndk.fetchEvents({ ids: idsToFetch }, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }, relaySet);
        const sortedAncestors = Array.from(ancestorEvents).sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
        console.log(`[useThread] Found ${sortedAncestors.length} ancestors`);
        setAncestors(sortedAncestors);
      } else {
        setAncestors([]);
      }

      // 3. Initial Fetch Direct Replies
      console.log("[useThread] Fetching replies...");
      await fetchMoreReplies(false, focalId);
      console.log("[useThread] Fetch cycle complete for", focalId);
    } catch (err) {
      console.error("[useThread] Thread fetch error:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [ndk, isReady, focalId, fetchMoreReplies, relaySet, loading]);

  useEffect(() => {
    // Only reset state if the focalId actually changed
    if (focalId && lastProcessedId.current !== focalId) {
      setFocalPost(null);
      setAncestors([]);
      setReplies([]);
      focalPostRef.current = null;
      oldestReplyTimestampRef.current = undefined;
    }
    
    if (isReady && focalId) {
      fetchThread();
    }
  }, [focalId, isReady, fetchThread]);

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
