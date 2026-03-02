import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { NDKEvent, NDKFilter, NDKRelaySet } from "@nostr-dev-kit/ndk";
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
          if (ev.kind === 1111) {
            const eTag = ev.tags.find(t => t[0] === 'e');
            return eTag?.[1] === targetId;
          }
          const replyTag = ev.tags.find(t => t[0] === 'e' && t[3] === 'reply');
          if (replyTag) return replyTag[1] === targetId;
          const eTags = ev.tags.filter(t => t[0] === 'e');
          return eTags[eTags.length - 1]?.[1] === targetId;
        })
        .sort((a, b) => (a.created_at ?? 0) - (a.created_at ?? 0));

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
  }, [ndk, focalId, relaySet]);

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

      // 2. Build Ancestor Chain (Recursive Upwards)
      const chain: NDKEvent[] = [];
      let currentEvent = focal;
      const visited = new Set<string>([focal.id]);

      for (let i = 0; i < 10; i++) {
        const parentId = currentEvent.tags.find(t => t[0] === 'e' && (t[3] === 'reply' || t[3] === 'root'))?.[1] || 
                         currentEvent.tags.filter(t => t[0] === 'e')[0]?.[1];

        if (!parentId || visited.has(parentId)) break;
        
        visited.add(parentId);
        const parent = await ndk.fetchEvent(parentId, undefined, relaySet);
        if (!parent) break;
        
        chain.unshift(parent);
        currentEvent = parent;
      }
      setAncestors(chain);

      // 3. Initial Fetch Direct Replies
      await fetchMoreReplies(false, focalId);
    } catch (err) {
      console.error("Thread fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, focalId, fetchMoreReplies, relaySet]);

  useEffect(() => {
    oldestReplyTimestampRef.current = undefined;
    setAncestors([]);
    setReplies([]);
    fetchThread();
  }, [fetchThread]);

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
      
      return Array.from(events)
        .filter(ev => {
          if (ev.kind === 1111) {
            const eTag = ev.tags.find(t => t[0] === 'e');
            return eTag?.[1] === eventId;
          }
          const replyTag = ev.tags.find(t => t[0] === 'e' && t[3] === 'reply');
          if (replyTag) return replyTag[1] === eventId;
          const eTags = ev.tags.filter(t => t[0] === 'e');
          return eTags[eTags.length - 1]?.[1] === eventId;
        })
        .sort((a, b) => (a.created_at ?? 0) - (a.created_at ?? 0));
    } catch (e) {
      console.error("Error fetching nested replies:", e);
      return [];
    }
  }, [ndk, relaySet]);

  return { focalPost, ancestors, replies, loading, loadingReplies, hasMoreReplies, loadMoreReplies, fetchRepliesFor };
}
