import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { type NostrFilter, type NostrEvent } from "@nostrify/types";
import { getStorage } from "@/lib/nostrify-storage";
import { createRelayPool } from "@/lib/nostrify-relay";
import { DEFAULT_RELAYS } from "@/lib/ndk";
import { ProfileMetadata } from "./useProfile";
import { useNDK } from "./useNDK";

const profileCache = new Map<string, ProfileMetadata>();

/**
 * Hook to fetch and manage user profile metadata using Nostrify.
 */
export function useNostrifyProfile(pubkey?: string) {
  const { signer } = useNDK();
  const [profile, setProfile] = useState<ProfileMetadata | null>(pubkey ? (profileCache.get(pubkey) || null) : null);
  const [loading, setLoading] = useState(false);
  const poolRef = useRef<ReturnType<typeof createRelayPool> | null>(null);

  const fetchProfile = useCallback(async (forceRelay = false) => {
    if (!pubkey) return;

    setLoading(true);

    try {
      const storage = await getStorage();
      const filter: NostrFilter = { kinds: [0], authors: [pubkey], limit: 1 };

      // 1. Try Storage first
      if (storage && !forceRelay) {
        const cached = await storage.query([filter]);
        if (cached.length > 0) {
          try {
            const content = JSON.parse(cached[0].content);
            const metadata = { ...content, pubkey, created_at: cached[0].created_at, tags: cached[0].tags };
            profileCache.set(pubkey, metadata);
            setProfile(metadata);
            setLoading(false);
            if (!forceRelay) return; 
          } catch (e) {
            console.error("[useNostrifyProfile] Failed to parse cached profile:", e);
          }
        }
      }

      // 2. Fetch from Relays
      if (!poolRef.current) {
        poolRef.current = createRelayPool(DEFAULT_RELAYS);
      }

      const stream = poolRef.current.req([filter]);
      for await (const msg of stream) {
        if (msg[0] === 'EVENT') {
          const event = msg[2];
          try {
            const content = JSON.parse(event.content);
            const metadata = { ...content, pubkey, created_at: event.created_at, tags: event.tags };
            profileCache.set(pubkey, metadata);
            setProfile(metadata);
            if (storage) {
              storage.event(event).catch(() => {});
            }
          } catch (e) {
            console.error("[useNostrifyProfile] Failed to parse relay profile:", e);
          }
          break; 
        } else if (msg[0] === 'EOSE') {
          break;
        }
      }
    } catch (error) {
      console.error("[useNostrifyProfile] Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [pubkey]);

  useEffect(() => {
    if (!pubkey) return;
    
    const cached = profileCache.get(pubkey);
    if (cached) {
      setProfile(cached);
    } else {
      fetchProfile();
    }
  }, [pubkey, fetchProfile]);

  const updateProfile = useCallback(async (metadata: ProfileMetadata) => {
    if (!signer || !pubkey) return false;
    try {
      const eventTemplate = {
        kind: 0,
        content: JSON.stringify(metadata),
        tags: metadata.tags || [],
        created_at: Math.floor(Date.now() / 1000),
      };
      const signed = await signer.signEvent(eventTemplate);
      
      if (!poolRef.current) {
        poolRef.current = createRelayPool(DEFAULT_RELAYS);
      }
      
      await poolRef.current.event(signed);
      
      const newMetadata = { ...metadata, pubkey, created_at: signed.created_at, tags: signed.tags };
      profileCache.set(pubkey, newMetadata);
      setProfile(newMetadata);
      return true;
    } catch (e) {
      console.error("[useNostrifyProfile] Failed to update profile:", e);
      return false;
    }
  }, [signer, pubkey]);

  return { 
    profile, 
    loading, 
    refresh: () => fetchProfile(true),
    updateProfile
  };
}
