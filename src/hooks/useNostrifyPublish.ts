import { useCallback, useRef, useMemo } from "react";
import { type NostrEvent } from "@nostrify/types";
import { createSigner } from "@/lib/nostrify-signer";
import { createRelayPool } from "@/lib/nostrify-relay";
import { getStorage } from "@/lib/nostrify-storage";
import { DEFAULT_RELAYS } from "@/lib/ndk";
import { useAuthStore } from "@/store/auth";

export function useNostrifyPublish(relays: string[] = DEFAULT_RELAYS) {
  const { privateKey } = useAuthStore();
  const poolRef = useRef<ReturnType<typeof createRelayPool> | null>(null);
  const relaysKey = useMemo(() => JSON.stringify(relays), [relays]);

  const publish = useCallback(async (eventTemplate: Omit<NostrEvent, 'id' | 'pubkey' | 'sig' | 'created_at'> & { created_at?: number }): Promise<NostrEvent> => {
    // 1. Prepare Event
    const signer = createSigner({ privateKey: privateKey || undefined });
    
    const event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'> = {
      ...eventTemplate,
      created_at: eventTemplate.created_at ?? Math.floor(Date.now() / 1000),
    };

    // 2. Sign Event
    const signedEvent = await signer.signEvent(event);

    // 3. Optimistic Save to Storage
    try {
      const storage = await getStorage();
      await storage.event(signedEvent);
    } catch (error) {
      console.error('Failed to save to local storage optimistically:', error);
    }

    // 4. Publish to Relays
    if (!poolRef.current) {
      poolRef.current = createRelayPool(relays);
    }

    // Use "fire and forget" pattern as per local-first mandates
    poolRef.current.event(signedEvent).catch(err => {
      console.error('Failed to publish to relays:', err);
    });

    return signedEvent;
  }, [privateKey, relaysKey, relays]);

  return {
    publish,
  };
}
