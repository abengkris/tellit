import { useEffect, useState, useRef, useCallback } from "react";
import { useNDK } from "@/hooks/useNDK";

export interface ProfileMetadata {
  pubkey?: string;
  name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
  banner?: string;
  display_name?: string;
  website?: string;
  pronouns?: string;
  bot?: boolean | string;
  created_at?: number;
  published_at?: number;
  tags?: string[][];
}

/**
 * Hook to fetch and manage user profile metadata.
 * Uses NDK cache and outbox model for reliable results.
 */
export function useProfile(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [profile, setProfile] = useState<ProfileMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchedPubkey = useRef<string | undefined>(undefined);

  const fetchMetadata = useCallback(async (forceRelay = false) => {
    if (!ndk || !isReady || !pubkey) return;
    
    setLoading(true);
    lastFetchedPubkey.current = pubkey;

    try {
      const user = ndk.getUser({ pubkey });
      
      let userProfile = null;

      if (forceRelay) {
        // Force a fresh fetch from relays by bypassing the user.fetchProfile cache logic
        const event = await ndk.fetchEvent({
          kinds: [0],
          authors: [pubkey]
        }, { 
          cacheUsage: 2, // 2 is ONLY_RELAY (strictly bypasses Dexie and internal object cache)
          closeOnEose: true 
        } as unknown as Record<string, unknown>);

        if (event) {
          try {
            const content = JSON.parse(event.content);
            userProfile = content;
            // Update the user object's profile so NDK's internal state is also fresh
            user.profile = content;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (user as any).kind0 = event;
          } catch (e) {
            console.error("Failed to parse profile content:", e);
          }
        }
      }

      // Fallback to standard fetch if forceRelay failed or wasn't requested
      if (!userProfile) {
        userProfile = await user.fetchProfile();
      }
      
      // Construct metadata object
      const metadata: ProfileMetadata = { 
        ...(userProfile || {}), 
        name: userProfile?.name ? String(userProfile.name) : undefined,
        display_name: userProfile?.display_name ? String(userProfile.display_name) : undefined,
        pubkey 
      };
      
      // Optimization: NDK caches the kind 0 event internally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kind0 = (user as any).kind0;
      if (kind0) {
        metadata.tags = kind0.tags;
        metadata.created_at = kind0.created_at;
        const publishedAtTag = kind0.tags.find((t: string[]) => t[0] === 'published_at');
        metadata.published_at = publishedAtTag && publishedAtTag[1] 
          ? parseInt(publishedAtTag[1]) 
          : kind0.created_at;
      }
      
      setProfile(metadata);
    } catch (error) {
      console.warn("Failed to fetch profile for", pubkey, error);
      // On error, provide a basic fallback profile
      setProfile({ pubkey });
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, pubkey]);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Skip if we already have this profile loaded and it hasn't changed
    if (lastFetchedPubkey.current === pubkey && profile) {
      return;
    }

    fetchMetadata();
  }, [ndk, isReady, pubkey, profile, fetchMetadata]);

  return { profile, loading, refresh: () => fetchMetadata(true) };
}
