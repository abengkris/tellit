import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WalletInfo {
  alias?: string;
  lud16?: string;
  methods?: string[];
  network?: string;
}

interface WalletState {
  nwcPairingCode: string | null;
  balance: number | null;
  info: WalletInfo | null;
  setNwcPairingCode: (code: string | null) => void;
  setBalance: (balance: number | null) => void;
  setInfo: (info: WalletInfo | null) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      nwcPairingCode: null,
      balance: null,
      info: null,
      setNwcPairingCode: (code) => set({ nwcPairingCode: code }),
      setBalance: (balance) => set({ balance }),
      setInfo: (info) => set({ info }),
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
