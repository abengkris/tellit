import { useEffect, useState, useRef, useCallback } from "react";
import NDK, { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";

export interface SapaNotification extends NDKEvent {
  type: 'reply' | 'mention' | 'like' | 'repost' | 'zap' | 'follow';
}

export function useNotifications() {
  const { ndk, isReady } = useNDK();
  const { user, isLoggedIn } = useAuthStore();
  const [notifications, setNotifications] = useState<SapaNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const oldestTimestampRef = useRef<number | undefined>(undefined);

  const processEvent = useCallback((event: NDKEvent): SapaNotification | null => {
    if (!user || event.pubkey === user.pubkey) return null;

    const notif = event as SapaNotification;
    
    // Kind 1: Reply or Mention
    if (event.kind === 1) {
      const isReply = event.tags.some(t => t[0] === 'e');
      notif.type = isReply ? 'reply' : 'mention';
    } 
    // Kind 6: Repost
    else if (event.kind === 6) {
      notif.type = 'repost';
    } 
    // Kind 7: Like
    else if (event.kind === 7) {
      notif.type = 'like';
    } 
    // Kind 9735: Zap
    else if (event.kind === 9735) {
      notif.type = 'zap';
    }
    // Kind 3: Follow
    else if (event.kind === 3) {
      notif.type = 'follow';
    }
    // Kind 1111: Comment (NIP-22)
    else if (event.kind === 1111) {
      notif.type = 'reply';
    }
    // Kind 30023: Article mention
    else if (event.kind === 30023) {
      notif.type = 'mention';
    }

    return notif;
  }, [user]);

  const fetchNotifications = useCallback(async (isLoadMore = false) => {
    if (!ndk || !isReady || !isLoggedIn || !user) return;

    setLoading(true);

    const filter: NDKFilter = {
      kinds: [1, 3, 6, 7, 1111, 9735, 30023],
      "#p": [user.pubkey],
      limit: 30,
    };

    if (isLoadMore && oldestTimestampRef.current) {
      filter.until = oldestTimestampRef.current - 1;
    }

    const events = await ndk.fetchEvents(filter);
    
    if (events.size < 30) {
      setHasMore(false);
    }

    const processed = Array.from(events)
      .map(e => processEvent(e))
      .filter((e): e is SapaNotification => e !== null);

    setNotifications((prev) => {
      const combined = isLoadMore ? [...prev, ...processed] : processed;
      const unique = Array.from(new Map(combined.map(n => [n.id, n])).values())
        .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      
      if (unique.length > 0) {
        oldestTimestampRef.current = unique[unique.length - 1].created_at;
      }
      
      return unique;
    });

    setLoading(false);
  }, [ndk, isReady, isLoggedIn, user, processEvent]);

  useEffect(() => {
    if (!ndk || !isReady || !isLoggedIn || !user) return;

    // Real-time listener for NEW notifications
    const filter: NDKFilter = {
      kinds: [1, 3, 6, 7, 1111, 9735, 30023],
      "#p": [user.pubkey],
      since: Math.floor(Date.now() / 1000),
    };

    const sub = ndk.subscribe(
      filter,
      { 
        closeOnEose: false, 
        groupableDelay: 200,
        onEvent: (event: NDKEvent) => {
          const notif = processEvent(event);
          if (!notif) return;

          setNotifications((prev) => {
            if (prev.find((n) => n.id === notif.id)) return prev;
            return [notif, ...prev].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
          });

          setUnreadCount((prev) => prev + 1);
        }
      }
    );
    subscriptionRef.current = sub;

    // Initial fetch
    fetchNotifications();

    return () => {
      sub.stop();
    };
  }, [ndk, isReady, isLoggedIn, user?.pubkey, fetchNotifications, processEvent]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(true);
    }
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, loading, loadMore, hasMore };
}
