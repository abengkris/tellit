"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKEvent, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";

/**
 * Supported NIP-51 and NIP-39 list kinds.
 */
export enum ListKind {
  Mute = 10000,
  Pinned = 10001,
  Relay = 10002,
  Bookmarks = 10003,
  ExternalIdentities = 10011,
  Interests = 10015,
  Emojis = 10030,
}

/**
 * Represents a verified external account linked via NIP-39.
 */
export interface ExternalIdentity {
  platform: string;
  identity: string;
  proof: string;
}

/**
 * Hook to manage various Nostr-based lists (Mutes, Bookmarks, Interests, etc.).
 * Supports both the current user's lists (with write access) and target users' lists (read-only).
 * 
 * @param targetPubkey Optional pubkey to fetch lists for. Defaults to current logged-in user.
 */
export function useLists(targetPubkey?: string) {
  const { ndk, isReady } = useNDK();
  const { user: currentUser } = useAuthStore();
  const pubkey = targetPubkey || currentUser?.pubkey;
  const isOwnProfile = !!currentUser && pubkey === currentUser.pubkey;
  
  const [mutedPubkeys, setMutedPubkeys] = useState<Set<string>>(new Set());
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState<Set<string>>(new Set());
  const [pinnedEventIds, setPinnedEventIds] = useState<Set<string>>(new Set());
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [externalIdentities, setExternalIdentities] = useState<ExternalIdentity[]>([]);
  const [loading, setLoading] = useState(true);

  // Cache latest events to avoid redundant fetches and clobbering
  const listEventsRef = useRef<Map<number, NDKEvent>>(new Map());

  const fetchLists = useCallback(async () => {
    if (!ndk || !isReady || !pubkey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch common NIP-51 and NIP-39 lists
      const kinds = [
        ListKind.Mute, 
        ListKind.Pinned, 
        ListKind.Bookmarks, 
        ListKind.Interests,
        ListKind.ExternalIdentities
      ] as number[];
      
      const events = await ndk.fetchEvents(
        { kinds, authors: [pubkey] },
        { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
      );

      const newMuted = new Set<string>();
      const newBookmarks = new Set<string>();
      const newPinned = new Set<string>();
      const newInterests = new Set<string>();
      const newIdentities: ExternalIdentity[] = [];

      // Group events by kind and find latest for each
      const latestByKind = new Map<number, NDKEvent>();
      events.forEach(event => {
        const existing = latestByKind.get(event.kind!);
        if (!existing || (event.created_at ?? 0) > (existing.created_at ?? 0)) {
          latestByKind.set(event.kind!, event);
        }
      });

      // Update ref
      latestByKind.forEach((event, kind) => {
        listEventsRef.current.set(kind, event);
        
        if (kind === ListKind.Mute) {
          event.tags.filter(t => t[0] === 'p').forEach(t => newMuted.add(t[1]));
        } else if (kind === ListKind.Bookmarks) {
          event.tags.filter(t => t[0] === 'e' || t[0] === 'a').forEach(t => newBookmarks.add(t[1]));
        } else if (kind === ListKind.Pinned) {
          event.tags.filter(t => t[0] === 'e').forEach(t => newPinned.add(t[1]));
        } else if (kind === ListKind.Interests) {
          event.tags.filter(t => t[0] === 't').forEach(t => newInterests.add(t[1]));
        } else if (kind === ListKind.ExternalIdentities) {
          event.tags.filter(t => t[0] === 'i' && t.length >= 3).forEach(t => {
            const [platform, identity] = t[1].split(':');
            if (platform && identity) {
              newIdentities.push({ platform, identity, proof: t[2] });
            }
          });
        }
      });

      setMutedPubkeys(newMuted);
      setBookmarkedEventIds(newBookmarks);
      setPinnedEventIds(newPinned);
      setInterests(newInterests);
      setExternalIdentities(newIdentities);
    } catch (err) {
      console.error("Error fetching NIP-51 lists:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, pubkey]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const updateList = useCallback(async (
    kind: ListKind, 
    tagType: string, 
    value: string, 
    action: 'add' | 'remove',
    extraTags: string[] = []
  ) => {
    if (!ndk || !currentUser || !isOwnProfile) return false;

    try {
      // 1. Fetch ALL versions from relays to find the TRULY latest (Safety logic from follow fix)
      const events = await ndk.fetchEvents(
        { kinds: [kind as number], authors: [currentUser.pubkey] },
        { 
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          closeOnEose: true
        }
      );

      const currentEvent = Array.from(events).sort(
        (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
      )[0];

      const newEvent = new NDKEvent(ndk);
      newEvent.kind = kind;
      newEvent.tags = currentEvent ? [...currentEvent.tags] : [];

      if (action === 'add') {
        const exists = newEvent.tags.some(t => t[0] === tagType && t[1] === value);
        if (!exists) {
          newEvent.tags.push([tagType, value, ...extraTags]);
        } else {
          return true; // Already exists
        }
      } else {
        newEvent.tags = newEvent.tags.filter(t => !(t[0] === tagType && t[1] === value));
      }

      await newEvent.sign();
      await newEvent.publish();
      
      // Update cache
      listEventsRef.current.set(kind, newEvent);

      // Update local state
      if (kind === ListKind.Mute) {
        setMutedPubkeys(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      } else if (kind === ListKind.Bookmarks) {
        setBookmarkedEventIds(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      } else if (kind === ListKind.Pinned) {
        setPinnedEventIds(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      } else if (kind === ListKind.Interests) {
        setInterests(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      } else if (kind === ListKind.ExternalIdentities) {
        // value here is "platform:identity"
        const [platform, identity] = value.split(':');
        setExternalIdentities(prev => {
          if (action === 'add') {
            return [...prev, { platform, identity, proof: extraTags[0] }];
          } else {
            return prev.filter(i => !(i.platform === platform && i.identity === identity));
          }
        });
      }

      return true;
    } catch (err) {
      console.error(`Failed to update NIP-51 list ${kind}:`, err);
      return false;
    }
  }, [ndk, currentUser, isOwnProfile]);

  return {
    mutedPubkeys,
    bookmarkedEventIds,
    pinnedEventIds,
    loading,
    refresh: fetchLists,
    
    // Muting
    muteUser: (pubkey: string) => updateList(ListKind.Mute, 'p', pubkey, 'add'),
    unmuteUser: (pubkey: string) => updateList(ListKind.Mute, 'p', pubkey, 'remove'),
    
    // Bookmarking
    bookmarkPost: (eventId: string) => updateList(ListKind.Bookmarks, 'e', eventId, 'add'),
    unbookmarkPost: (eventId: string) => updateList(ListKind.Bookmarks, 'e', eventId, 'remove'),
    
    // Pinning
    pinPost: (eventId: string) => updateList(ListKind.Pinned, 'e', eventId, 'add'),
    unpinPost: (eventId: string) => updateList(ListKind.Pinned, 'e', eventId, 'remove'),
    isPinned: (eventId: string) => pinnedEventIds.has(eventId),
    isBookmarked: (eventId: string) => bookmarkedEventIds.has(eventId),
    isMuted: (pubkey: string) => mutedPubkeys.has(pubkey),

    // Interests
    interests,
    addInterest: (hashtag: string) => updateList(ListKind.Interests, 't', hashtag.toLowerCase().replace('#', ''), 'add'),
    removeInterest: (hashtag: string) => updateList(ListKind.Interests, 't', hashtag.toLowerCase().replace('#', ''), 'remove'),
    isInterested: (hashtag: string) => interests.has(hashtag.toLowerCase().replace('#', '')),

    // External Identities (NIP-39)
    externalIdentities,
    addExternalIdentity: (platform: string, identity: string, proof: string) => 
      updateList(ListKind.ExternalIdentities, 'i', `${platform}:${identity}`, 'add', [proof]),
    removeExternalIdentity: (platform: string, identity: string) => 
      updateList(ListKind.ExternalIdentities, 'i', `${platform}:${identity}`, 'remove'),
  };
}
