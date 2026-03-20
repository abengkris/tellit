"use client";

import { useState, useEffect } from "react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";

/**
 * Hook to fetch and sum zaps for an event or user.
 */
export function useZaps(targetId?: string, isUser = false) {
  const { ndk, isReady } = useNDK();
  const [totalSats, setTotalSats] = useState(0);
  const [zaps, setZaps] = useState<NDKEvent[]>([]);

  useEffect(() => {
    if (!ndk || !isReady || !targetId) return;

    const filter: NDKFilter = {
      kinds: [9735],
    };

    if (isUser) {
      filter["#p"] = [targetId];
    } else {
      filter["#e"] = [targetId];
    }

    const processReceipt = (event: NDKEvent) => {
      // NIP-57: Verify receipt matches the intended target
      if (isUser) {
        const pTag = event.tags.find(t => t[0] === 'p')?.[1];
        if (pTag !== targetId) return;
      } else {
        const eTag = event.tags.find(t => t[0] === 'e')?.[1];
        if (eTag !== targetId) return;
      }

      // Find the 'description' tag which contains the Zap Request (kind 9734)
      const descriptionTag = event.tags.find(t => t[0] === "description");
      if (!descriptionTag) return;

      try {
        const zapRequest = JSON.parse(descriptionTag[1]);
        const amountTag = zapRequest.tags.find((t: string[]) => t[0] === "amount");
        if (amountTag) {
          const msats = parseInt(amountTag[1]);
          const sats = msats / 1000;
          
          setZaps((prev) => {
            if (prev.some(z => z.id === event.id)) return prev;
            setTotalSats((total) => total + sats);
            return [...prev, event];
          });
        }
      } catch {
        // Fallback or ignore malformed receipts
      }
    };

    const sub = ndk.subscribe(
      filter,
      { 
        closeOnEose: false, 
        groupableDelay: 500,
        groupableDelayType: "at-most",
      },
      {
        onEvent: processReceipt
      }
    );

    return () => sub.stop();
  }, [ndk, isReady, targetId, isUser]);

  return { totalSats, zaps, count: zaps.length };
}
