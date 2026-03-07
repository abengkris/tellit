import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WalletState {
  nwcPairingCode: string | null;
  balance: number | null;
  setNwcPairingCode: (code: string | null) => void;
  setBalance: (balance: number | null) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      nwcPairingCode: null,
      balance: null,
      setNwcPairingCode: (code) => set({ nwcPairingCode: code }),
      setBalance: (balance) => set({ balance }),
    }),
    {
      name: "tellit-wallet-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nwcPairingCode: state.nwcPairingCode,
      }),
    }
  )
);
