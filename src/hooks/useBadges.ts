"use client";

import { useEffect, useState, useCallback } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKSubscriptionCacheUsage, NDKKind } from "@nostr-dev-kit/ndk";

export interface BadgeMetadata {
  id: string; // d-tag
  name?: string;
  image?: string;
  description?: string;
  thumb?: string;
  issuerPubkey: string;
}

export interface BadgeInfo {
  definition: BadgeMetadata;
  awardEventId: string;
}

/**
 * Hook to fetch and manage NIP-58 badges for a user.
 */
export function useBadges(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBadges = useCallback(async () => {
    if (!ndk || !isReady || !pubkey) return;

    setLoading(true);
    try {
      // 1. Fetch Profile Badges (Kind 30008)
      const profileBadgesEvent = await ndk.fetchEvent({
        kinds: [30008 as NDKKind],
        authors: [pubkey],
        "#d": ["profile_badges"]
      }, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST });

      if (!profileBadgesEvent) {
        setBadges([]);
        setLoading(false);
        return;
      }

      // 2. Parse a and e tags
      const pairs: { a: string; e: string }[] = [];
      for (let i = 0; i < profileBadgesEvent.tags.length; i++) {
        const tag = profileBadgesEvent.tags[i];
        if (tag[0] === 'a') {
          const nextTag = profileBadgesEvent.tags[i + 1];
          if (nextTag && nextTag[0] === 'e') {
            pairs.push({ a: tag[1], e: nextTag[1] });
            i++; // skip the e tag in next iteration
          }
        }
      }

      if (pairs.length === 0) {
        setBadges([]);
        setLoading(false);
        return;
      }

      // 3. Fetch Definitions (Kind 30009)
      const definitionEvents = await ndk.fetchEvents({
        kinds: [30009 as NDKKind],
      }, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST });

      const badgeInfos: BadgeInfo[] = [];
      
      // For each pair, resolve definition
      for (const pair of pairs) {
        const parts = pair.a.split(':');
        if (parts.length < 3) continue;
        
        const issuer = parts[1];
        const dTag = parts[2];
        
        // Find the definition event
        const defEvent = Array.from(definitionEvents).find(e => 
          e.kind === 30009 && 
          e.pubkey === issuer && 
          e.tags.find(t => t[0] === 'd')?.[1] === dTag
        );

        if (defEvent) {
          const metadata: BadgeMetadata = {
            id: dTag,
            name: defEvent.tags.find(t => t[0] === 'name')?.[1],
            image: defEvent.tags.find(t => t[0] === 'image')?.[1],
            description: defEvent.tags.find(t => t[0] === 'description')?.[1],
            thumb: defEvent.tags.find(t => t[0] === 'thumb')?.[1],
            issuerPubkey: issuer
          };
          
          badgeInfos.push({
            definition: metadata,
            awardEventId: pair.e
          });
        }
      }

      setBadges(badgeInfos);
    } catch (err) {
      console.error("[useBadges] Error fetching badges:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, pubkey]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return { badges, loading, refresh: fetchBadges };
}
