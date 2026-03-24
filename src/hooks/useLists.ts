"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKEvent, NDKSubscriptionCacheUsage, NDKInterestList, NDKList } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";
import { addClientTag } from "@/lib/utils/nostr";

/**
 * Supported NIP-51 and NIP-39 list kinds.
 */
export enum ListKind {
  Follows = 3,
  Mute = 10000,
  Pinned = 10001,
  Relay = 10002,
  Bookmarks = 10003,
  Communities = 10004,
  PublicChats = 10005,
  BlockedRelays = 10006,
  SearchRelays = 10007,
  SimpleGroups = 10009,
  ExternalIdentities = 10011,
  RelayFeeds = 10012,
  Interests = 10015,
  MediaFollows = 10020,
  Emojis = 10030,
  DMRelays = 10050,
  GoodWikiAuthors = 10101,
  GoodWikiRelays = 10102,
  FollowSets = 30000,
  RelaySets = 30002,
  BookmarkSets = 30003,
  CurationSets = 30004,
  VideoCurationSets = 30005,
  PictureCurationSets = 30006,
  KindMuteSets = 30007,
  InterestSets = 30015,
  EmojiSets = 30030,
  ReleaseArtifactSets = 30063,
  AppCurationSets = 30267,
  Calendar = 31924,
  StarterPacks = 39089,
  MediaStarterPacks = 39092,
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

  const fetchLists = useCallback(async (isMounted: () => boolean) => {
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

      if (!isMounted()) return;

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

      // Update collections
      for (const [kind, event] of latestByKind.entries()) {
        listEventsRef.current.set(kind, event);
        
        let allTags = [...event.tags];

        // NIP-51: Handle private items in .content
        if (isOwnProfile && event.content && ndk.signer && currentUser) {
          try {
            const user = ndk.getUser({ pubkey: currentUser.pubkey });
            const decrypted = await ndk.signer.decrypt(user, event.content, "nip44");
            if (decrypted) {
              const privateTags = JSON.parse(decrypted);
              if (Array.isArray(privateTags)) {
                allTags = [...allTags, ...privateTags];
              }
            }
          } catch (e) {
            console.warn(`Failed to decrypt private items for list ${kind}:`, e);
          }
        }
        
        if (kind === ListKind.Mute) {
          allTags.filter(t => t[0] === 'p').forEach(t => newMuted.add(t[1]));
        } else if (kind === ListKind.Bookmarks) {
          allTags.filter(t => t[0] === 'e' || t[0] === 'a').forEach(t => newBookmarks.add(t[1]));
        } else if (kind === ListKind.Pinned) {
          allTags.filter(t => t[0] === 'e').forEach(t => newPinned.add(t[1]));
        } else if (kind === ListKind.Interests) {
          allTags.filter(t => t[0] === 't').forEach(t => newInterests.add(t[1]));
        } else if (kind === ListKind.ExternalIdentities) {
          allTags.filter(t => t[0] === 'i' && t.length >= 3).forEach(t => {
            const [platform, identity] = t[1].split(':');
            if (platform && identity) {
              newIdentities.push({ platform, identity, proof: t[2] });
            }
          });
        }
      }

      setMutedPubkeys(newMuted);
      setBookmarkedEventIds(newBookmarks);
      setPinnedEventIds(newPinned);
      setInterests(newInterests);
      setExternalIdentities(newIdentities);
    } catch (err) {
      console.error("Error fetching NIP-51 lists:", err);
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [ndk, isReady, pubkey, currentUser, isOwnProfile]);

  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout: 10 seconds to fetch lists from relays/cache
    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 10000);

    fetchLists(() => isMounted).finally(() => {
      clearTimeout(timeout);
    });

    return () => { 
      isMounted = false; 
      clearTimeout(timeout); 
    };
  }, [fetchLists]);

  const updateList = useCallback(async (
    kind: ListKind, 
    tagType: string, 
    value: string, 
    action: 'add' | 'remove',
    extraTags: string[] = [],
    isPrivate: boolean = false
  ) => {
    if (!ndk || !currentUser || !isOwnProfile) return false;

    try {
      // 1. Fetch ALL versions from relays to find the TRULY latest
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

      let newEvent: NDKEvent;

      if (kind === ListKind.Interests) {
        const list = currentEvent ? NDKInterestList.from(currentEvent) : new NDKInterestList(ndk);
        if (action === 'add') {
          list.addInterest(value);
        } else {
          list.removeInterest(value);
        }
        newEvent = list;
      } else {
        // Use NDKList for better NIP-51 support (encrypted items)
        const list = currentEvent ? NDKList.from(currentEvent) : new NDKList(ndk);
        list.kind = kind;

        if (action === 'add') {
          // Check if it already exists either public or private
          // For now, let's just proceed with addItem, NDKList might handle it or we'll have duplicates
          await list.addItem([tagType, value, ...extraTags], undefined, isPrivate);
        } else {
          // Remove from tags (public)
          list.tags = list.tags.filter(t => !(t[0] === tagType && t[1] === value));
          
          // Handle private removal if encrypted content exists
          if (list.content) {
            const user = ndk.getUser({ pubkey: currentUser.pubkey });
            const decrypted = await ndk.signer?.decrypt(user, list.content, "nip44");
            if (decrypted) {
              let privateTags = JSON.parse(decrypted);
              if (Array.isArray(privateTags)) {
                const initialLen = privateTags.length;
                privateTags = privateTags.filter((t: string[]) => !(t[0] === tagType && t[1] === value));
                
                if (privateTags.length !== initialLen) {
                  // Re-encrypt
                  list.content = await ndk.signer?.encrypt(user, JSON.stringify(privateTags), "nip44") || "";
                }
              }
            }
          }
        }
        newEvent = list;
      }

      addClientTag(newEvent);
      await newEvent.sign();
      await newEvent.publishReplaceable();
      
      // Update cache
      listEventsRef.current.set(kind, newEvent);

      // Update NDK's internal mute list for immediate effect
      if (kind === ListKind.Mute && ndk.activeUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mutes = (ndk as any).mutedIds;
        if (mutes) {
          if (action === 'add') {
            mutes.add(value);
          } else {
            mutes.delete(value);
          }
        }
      }

      // Update local state
      if (kind === ListKind.Mute) {
        setMutedPubkeys(prev => {
          const next = new Set(prev);
          if (action === 'add') {
            next.add(value);
          } else {
            next.delete(value);
          }
          return next;
        });
      } else if (kind === ListKind.Bookmarks) {
        setBookmarkedEventIds(prev => {
          const next = new Set(prev);
          if (action === 'add') {
            next.add(value);
          } else {
            next.delete(value);
          }
          return next;
        });
      } else if (kind === ListKind.Pinned) {
        setPinnedEventIds(prev => {
          const next = new Set(prev);
          if (action === 'add') {
            next.add(value);
          } else {
            next.delete(value);
          }
          return next;
        });
      } else if (kind === ListKind.Interests) {
        setInterests(prev => {
          const next = new Set(prev);
          if (action === 'add') {
            next.add(value);
          } else {
            next.delete(value);
          }
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
    bookmarkPost: (eventId: string, isPrivate: boolean = false) => updateList(ListKind.Bookmarks, 'e', eventId, 'add', [], isPrivate),
    unbookmarkPost: (eventId: string) => updateList(ListKind.Bookmarks, 'e', eventId, 'remove'),
    
    // Pinning
    pinPost: (eventId: string, isPrivate: boolean = false) => updateList(ListKind.Pinned, 'e', eventId, 'add', [], isPrivate),
    unpinPost: (eventId: string) => updateList(ListKind.Pinned, 'e', eventId, 'remove'),
    isPinned: (eventId: string) => pinnedEventIds.has(eventId),
    isBookmarked: (eventId: string) => bookmarkedEventIds.has(eventId),
    isMuted: (pubkey: string) => mutedPubkeys.has(pubkey),

    // Interests
    interests,
    addInterest: (hashtag: string, isPrivate: boolean = false) => updateList(ListKind.Interests, 't', hashtag.toLowerCase().replace('#', ''), 'add', [], isPrivate),
    removeInterest: (hashtag: string) => updateList(ListKind.Interests, 't', hashtag.toLowerCase().replace('#', ''), 'remove'),
    isInterested: (hashtag: string) => interests.has(hashtag.toLowerCase().replace('#', '')),

    // External Identities (NIP-39)
    externalIdentities,
    addExternalIdentity: (platform: string, identity: string, proof: string, isPrivate: boolean = false) => 
      updateList(ListKind.ExternalIdentities, 'i', `${platform}:${identity}`, 'add', [proof], isPrivate),
    removeExternalIdentity: (platform: string, identity: string) => 
      updateList(ListKind.ExternalIdentities, 'i', `${platform}:${identity}`, 'remove'),
  };
}
