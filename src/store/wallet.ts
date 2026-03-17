import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WalletType = 'nwc' | 'nip-60' | 'webln' | 'none';

interface WalletInfo {
  alias?: string;
  lud16?: string;
  methods?: string[];
  network?: string;
}

export interface EncryptedData {
  nwcPairingCode?: string | null;
  cashuMints?: string[] | null;
}

interface WalletState {
  walletType: WalletType;
  // Raw data (Persisted in localStorage, but cleared when locked if PIN exists)
  nwcPairingCode: string | null;
  cashuMints: string[];
  
  // Persisted fields
  isLocked: boolean;
  pinHash: string | null;
  pinSalt: string | null;
  encryptedData: string | null; // Base64 of EncryptedData object
  
  // Shared UI state
  balance: number | null;
  balanceLastUpdated: number | null;
  info: WalletInfo | null;
  
  // Actions
  setWalletType: (type: WalletType) => void;
  setNwcPairingCode: (code: string | null) => void;
  setCashuMints: (mints: string[]) => void;
  setBalance: (balance: number | null) => void;
  setInfo: (info: WalletInfo | null) => void;
  
  // Encryption Actions
  setPin: (pinHash: string, pinSalt: string, encryptedData: string) => void;
  unlock: (data: EncryptedData) => void;
  lock: () => void;
  resetWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      walletType: 'none',
      nwcPairingCode: null,
      cashuMints: ["https://8333.pw"],
      balance: null,
      balanceLastUpdated: null,
      info: null,
      
      isLocked: false,
      pinHash: null,
      pinSalt: null,
      encryptedData: null,

      setWalletType: (walletType) => set({ walletType, balance: null, info: null }),
      setNwcPairingCode: (code) => set({ nwcPairingCode: code, walletType: code ? 'nwc' : 'none' }),
      setCashuMints: (cashuMints) => set({ cashuMints }),
      setBalance: (balance) => set({ balance, balanceLastUpdated: Date.now() }),
      setInfo: (info) => set({ info }),

      setPin: (pinHash, pinSalt, encryptedData) => set({ 
        pinHash, 
        pinSalt, 
        encryptedData, 
        isLocked: false 
      }),
      
      unlock: (data) => set({
        nwcPairingCode: data.nwcPairingCode || null,
        cashuMints: data.cashuMints || ["https://8333.pw"],
        isLocked: false
      }),

      lock: () => set({
        nwcPairingCode: null,
        isLocked: true
      }),

      resetWallet: () => set({ 
        walletType: 'none', 
        nwcPairingCode: null, 
        cashuMints: ["https://8333.pw"],
        balance: null, 
        balanceLastUpdated: null,
        info: null,
        isLocked: false,
        pinHash: null,
        pinSalt: null,
        encryptedData: null
      }),
    }),
    {
      name: "tellit-wallet-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        walletType: state.walletType,
        nwcPairingCode: state.nwcPairingCode,
        cashuMints: state.cashuMints,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        encryptedData: state.encryptedData,
        isLocked: !!state.pinHash,
      }),
    }
  )
);
