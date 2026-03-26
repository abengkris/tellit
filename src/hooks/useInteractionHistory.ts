"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface InteractionHistoryState {
  // pubkey -> count of interactions
  history: Record<string, number>;
  recordInteraction: (pubkey: string, weight?: number) => void;
  getTopInteracted: (limit?: number) => string[];
  getHistoryMap: () => Map<string, number>;
}

/**
 * Hook to track and persist user interactions with other pubkeys.
 * This is used for local-first "For You" feed scoring.
 * Zero-cost, zero-server.
 */
export const useInteractionHistoryStore = create<InteractionHistoryState>()(
  persist(
    (set, get) => ({
      history: {},

      recordInteraction: (pubkey: string, weight = 1) => {
        if (!pubkey || !/^[0-9a-fA-F]{64}$/.test(pubkey)) return;
        
        set((state) => {
          const currentCount = state.history[pubkey] || 0;
          return {
            history: {
              ...state.history,
              [pubkey]: currentCount + weight,
            },
          };
        });
      },

      getTopInteracted: (limit = 10) => {
        const history = get().history;
        return Object.entries(history)
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .map(([pubkey]) => pubkey);
      },

      getHistoryMap: () => {
        return new Map(Object.entries(get().history));
      },
    }),
    {
      name: "tellit-interaction-history",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function useInteractionHistory() {
  const store = useInteractionHistoryStore();
  
  const historyMap = useMemo(() => store.getHistoryMap(), [store]);

  return useMemo(() => ({
    history: store.history,
    recordInteraction: store.recordInteraction,
    topInteracted: store.getTopInteracted,
    historyMap,
  }), [store, historyMap]);
}
