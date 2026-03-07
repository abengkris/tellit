import { useEffect, useState } from "react";
import { useNDK } from "@/hooks/useNDK";

export interface ProfileMetadata {
  pubkey?: string;
  name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
  banner?: string;
  displayName?: string;
  website?: string;
  pronouns?: string;
  bot?: boolean | string;
  published_at?: number;
  tags?: string[][];
}

export function useProfile(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [profile, setProfile] = useState<ProfileMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchMetadata = async () => {
      try {
        const user = ndk.getUser({ pubkey });
        // fetchProfile handles fetching from cache first, then relays
        // It also populates the raw event (Kind 0) in the user object
        const userProfile = await user.fetchProfile();
        
        if (isMounted && userProfile) {
          const metadata: ProfileMetadata = { ...userProfile, pubkey };
          
          // Optimization: NDK caches the kind 0 event after fetchProfile.
          // We can access it directly instead of fetching it again.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kind0 = (user as any).kind0;
          if (kind0) {
            metadata.tags = kind0.tags;
            const publishedAtTag = kind0.tags.find((t: string[]) => t[0] === 'published_at');
            if (publishedAtTag && publishedAtTag[1]) {
              metadata.published_at = parseInt(publishedAtTag[1]);
            } else {
              metadata.published_at = kind0.created_at;
            }
          }
          
          setProfile(metadata);
        }
      } catch (error) {
        console.error("Error fetching profile for", pubkey, error);
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
