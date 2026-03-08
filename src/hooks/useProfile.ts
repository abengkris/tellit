import { useEffect, useState, useRef } from "react";
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

    let isMounted = true;
    setLoading(true);
    lastFetchedPubkey.current = pubkey;

    const fetchMetadata = async () => {
      try {
        const user = ndk.getUser({ pubkey });
        
        // fetchProfile fetches from cache first, then relays
        const userProfile = await user.fetchProfile();
        
        if (isMounted) {
          // Construct metadata object
          const metadata: ProfileMetadata = { 
            ...(userProfile || {}), 
            pubkey 
          };
          
          // Optimization: NDK caches the kind 0 event internally
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kind0 = (user as any).kind0;
          if (kind0) {
            metadata.tags = kind0.tags;
            const publishedAtTag = kind0.tags.find((t: string[]) => t[0] === 'published_at');
            metadata.published_at = publishedAtTag && publishedAtTag[1] 
              ? parseInt(publishedAtTag[1]) 
              : kind0.created_at;
          }
          
          setProfile(metadata);
        }
      } catch (error) {
        console.warn("Failed to fetch profile for", pubkey, error);
        // On error, provide a basic fallback profile
        if (isMounted) {
          setProfile({ pubkey });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, pubkey]);

  return { profile, loading };
}
