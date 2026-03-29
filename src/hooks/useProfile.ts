import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNDK } from "@/hooks/useNDK";
import { getProfileUrl } from "@/lib/utils/identity";
import { idLog } from "@/lib/utils/id-logger";
import { NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useNostrifyProfile } from "./useNostrifyProfile";

export interface ProfileMetadata {
  pubkey?: string;
  name?: string;
  picture?: string;
  image?: string; // Common alternative to picture
  about?: string;
  nip05?: string;
  lud16?: string;
  banner?: string;
  display_name?: string;
  displayName?: string; // Deprecated NIP-24
  website?: string;
  pronouns?: string;
  bot?: boolean | string;
  birthday?: {
    year?: number;
    month?: number;
    day?: number;
  };
  created_at?: number;
  published_at?: number;
  tags?: string[][];
}

// Global session cache to avoid any re-fetching (even from IndexedDB) within the same session
const globalProfileCache = new Map<string, ProfileMetadata>();

/**
 * Hook to fetch and manage user profile metadata.
 * Uses NDK cache and outbox model for reliable results.
 * Gradually migrating to useNostrifyProfile.
 */
export function useProfile(pubkey?: string) {
  const { profile: nostrifyProfile, loading: nostrifyLoading, refresh: nostrifyRefresh } = useNostrifyProfile(pubkey);
  const { ndk, isReady } = useNDK();
  const [profile, setProfile] = useState<ProfileMetadata | null>(pubkey ? (globalProfileCache.get(pubkey) || null) : null);
  const [loading, setLoading] = useState(false);
  const lastFetchedPubkey = useRef<string | undefined>(undefined);

  const fetchMetadata = useCallback(async (forceRelay = false) => {
    if (!ndk || !isReady || !pubkey) return;
    
    setLoading(true);
    lastFetchedPubkey.current = pubkey;

    try {
      const user = ndk.getUser({ pubkey });
      
      // 1. Try Cache-Only first for maximum speed
      if (!profile && !forceRelay) {
        const cachedEvent = await ndk.fetchEvent({
          kinds: [0],
          authors: [pubkey]
        }, { cacheUsage: NDKSubscriptionCacheUsage.ONLY_CACHE });

        if (cachedEvent) {
          try {
            const content = JSON.parse(cachedEvent.content);
            const metadata = { ...content, pubkey, created_at: cachedEvent.created_at, tags: cachedEvent.tags };
            globalProfileCache.set(pubkey, metadata);
            setProfile(metadata);
            setLoading(false); // Can stop loading early if found in cache
          } catch (_) {
            // Ignore parse errors
          }
        }
      }

      // 2. Revalidate from Relays if needed
      let userProfile = null;

      if (forceRelay) {
        const event = await ndk.fetchEvent({
          kinds: [0],
          authors: [pubkey]
        }, { 
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          closeOnEose: true 
        });

        if (event) {
          try {
            userProfile = JSON.parse(event.content);
            user.profile = userProfile;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (user as any).kind0 = event;
          } catch (e) {
            console.error("Failed to parse profile content:", e);
          }
        }
      }

      if (!userProfile) {
        userProfile = await user.fetchProfile();
      }

      if (userProfile) {
        const metadata: ProfileMetadata = { 
          ...(userProfile || {}), 
          name: userProfile?.name ? String(userProfile.name) : undefined,
          display_name: (userProfile?.display_name || userProfile?.displayName) ? String(userProfile.display_name || userProfile.displayName) : undefined,
          pubkey 
        };
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kind0 = (user as any).kind0;
        if (kind0) {
          metadata.tags = kind0.tags;
          metadata.created_at = kind0.created_at;
        }
        
        globalProfileCache.set(pubkey, metadata);
        setProfile(metadata);
      }
    } catch (error) {
      idLog.error(`Failed to fetch profile for ${pubkey}`, error);
      if (!profile) setProfile({ pubkey });
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, pubkey, profile]);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setProfile(prev => (prev === null ? prev : null));
      setLoading(prev => (prev === false ? prev : false));
      return;
    }

    // Check memory cache instantly
    const cached = globalProfileCache.get(pubkey);
    if (cached && lastFetchedPubkey.current === pubkey) {
      return;
    }

    if (cached) {
      setProfile(prev => (prev === cached ? prev : cached));
      lastFetchedPubkey.current = pubkey;
      return;
    }

    fetchMetadata();
  }, [ndk, isReady, pubkey, fetchMetadata]);

  const profileUrl = useMemo(() => {
    const p = nostrifyProfile || profile;
    return getProfileUrl(p ? { ...p, pubkey } : { pubkey });
  }, [nostrifyProfile, profile, pubkey]);

  const refresh = useCallback(() => {
    nostrifyRefresh();
    fetchMetadata(true);
  }, [nostrifyRefresh, fetchMetadata]);

  return useMemo(() => ({ 
    profile: nostrifyProfile || profile, 
    loading: nostrifyLoading || loading, 
    profileUrl, 
    refresh 
  }), [nostrifyProfile, profile, nostrifyLoading, loading, profileUrl, refresh]);
}
