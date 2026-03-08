import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WalletType = 'nwc' | 'cashu' | 'none';

interface WalletInfo {
  alias?: string;
  lud16?: string;
  methods?: string[];
  network?: string;
}

interface WalletState {
  walletType: WalletType;
  // NWC
  nwcPairingCode: string | null;
  // Cashu
  cashuMints: string[];
  // Shared
  balance: number | null;
  info: WalletInfo | null;
  
  // Actions
  setWalletType: (type: WalletType) => void;
  setNwcPairingCode: (code: string | null) => void;
  setCashuMints: (mints: string[]) => void;
  setBalance: (balance: number | null) => void;
  setInfo: (info: WalletInfo | null) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      walletType: 'none',
      nwcPairingCode: null,
      cashuMints: ['https://8333.space:3338'],
      balance: null,
      info: null,

      setWalletType: (walletType) => set({ walletType, balance: null, info: null }),
      setNwcPairingCode: (code) => set({ nwcPairingCode: code, walletType: code ? 'nwc' : 'none' }),
      setCashuMints: (cashuMints) => set({ cashuMints }),
      setBalance: (balance) => set({ balance }),
      setInfo: (info) => set({ info }),
    }),
    {
      name: "tellit-wallet-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        walletType: state.walletType,
        nwcPairingCode: state.nwcPairingCode,
        cashuMints: state.cashuMints,
      }),
    }
  )
);
