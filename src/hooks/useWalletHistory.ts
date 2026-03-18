"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent, NDKFilter, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { NDKWalletTransaction } from "@nostr-dev-kit/wallet";
import { useNDK } from "./useNDK";
import { useWallet } from "./useWallet";
import { useAuthStore } from "@/store/auth";

interface UseWalletHistoryReturn {
  transactions: NDKWalletTransaction[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useWalletHistory(): UseWalletHistoryReturn {
  const { ndk } = useNDK();
  const { wallet, fetchTransactions } = useWallet();
  const { user } = useAuthStore();
  
  const [transactions, setTransactions] = useState<NDKWalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(true);

  const loadData = useCallback(async () => {
    if (!ndk || !user?.pubkey) return;

    setIsLoading(true);
    try {
      // 1. Fetch from wallet provider (NWC/Cashu/WebLN)
      let walletTxs: NDKWalletTransaction[] = [];
      if (wallet) {
        walletTxs = await fetchTransactions();
      }

      // 2. Fetch Zap Receipts (Kind 9735) as fallback/supplement
      const filter: NDKFilter = {
        kinds: [9735],
        authors: [user.pubkey], 
        limit: 30
      };
      const receivedFilter: NDKFilter = {
        kinds: [9735],
        "#p": [user.pubkey], 
        limit: 30
      };

      const fetchZaps = async (f: NDKFilter) => {
        return new Promise<Set<NDKEvent>>((resolve) => {
          const events = new Set<NDKEvent>();
          const sub = ndk.subscribe(f, { 
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
          });
          sub.on("event", (e) => events.add(e));
          sub.on("eose", () => resolve(events));
          setTimeout(() => { sub.stop(); resolve(events); }, 5000);
        });
      };

      const [sent, received] = await Promise.all([
        fetchZaps(filter),
        fetchZaps(receivedFilter)
      ]);

      if (!isMounted.current) return;

      const allZaps = Array.from(new Set([...Array.from(sent), ...Array.from(received)]));
      const mappedZaps: NDKWalletTransaction[] = allZaps.map(zap => {
        const parsed = parseZapReceipt(zap, user.pubkey);
        return {
          id: `zap-${zap.id}`,
          direction: parsed.isSent ? 'out' : 'in',
          amount: parsed.amount,
          timestamp: parsed.timestamp,
          description: parsed.isSent ? 'Sent Zap' : 'Received Zap',
        };
      });

      // 3. Merge and Deduplicate
      const deduplicated = new Map<string, NDKWalletTransaction>();
      walletTxs.forEach(tx => deduplicated.set(tx.id, tx));

      mappedZaps.forEach(zapTx => {
        const isDuplicate = walletTxs.some(wTx => 
          wTx.amount === zapTx.amount && 
          Math.abs(wTx.timestamp - zapTx.timestamp) < 10 &&
          wTx.direction === zapTx.direction
        );

        if (!isDuplicate) {
          deduplicated.set(zapTx.id, zapTx);
        }
      });

      const combined = Array.from(deduplicated.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);

      setTransactions(combined);
    } catch (err) {
      console.error("[useWalletHistory] Error:", err);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [ndk, user?.pubkey, wallet, fetchTransactions]);

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => { isMounted.current = false; };
  }, [loadData]);

  return { 
    transactions, 
    isLoading, 
    refresh: loadData 
  };
}

// Internal helper for parsing zap receipts
function parseZapReceipt(zap: NDKEvent, currentUserPubkey?: string) {
  let senderPubkey: string | null = null;
  const recipientPubkey: string | null = zap.tags.find(t => t[0] === 'p')?.[1] || null;
  let amount = 0;

  try {
    const descriptionTag = zap.tags.find(t => t[0] === 'description');
    if (descriptionTag?.[1]) {
      const zapRequest = JSON.parse(descriptionTag[1]);
      senderPubkey = zapRequest.pubkey;
      const amountTag = zapRequest.tags.find((t: string[]) => t[0] === 'amount');
      if (amountTag?.[1]) {
        amount = Math.floor(Number(amountTag[1]) / 1000);
      }
    }
  } catch { /* ignore */ }

  const isSent = senderPubkey === currentUserPubkey;
  return {
    isSent,
    amount,
    timestamp: zap.created_at || 0,
    otherPartyPubkey: isSent ? recipientPubkey : senderPubkey
  };
}
