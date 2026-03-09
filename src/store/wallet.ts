import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WalletType = 'nwc' | 'none';

interface WalletInfo {
  alias?: string;
  lud16?: string;
  methods?: string[];
  network?: string;
}

export interface EncryptedData {
  nwcPairingCode?: string | null;
}

interface WalletState {
  walletType: WalletType;
  // Raw data (in-memory only, NOT persisted)
  nwcPairingCode: string | null;
  
  // Persisted fields
  isLocked: boolean;
  pinHash: string | null;
  pinSalt: string | null;
  encryptedData: string | null; // Base64 of EncryptedData object
  
  // Shared UI state
  balance: number | null;
  info: WalletInfo | null;
  
  // Actions
  setWalletType: (type: WalletType) => void;
  setNwcPairingCode: (code: string | null) => void;
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
      balance: null,
      info: null,
      
      isLocked: false,
      pinHash: null,
      pinSalt: null,
      encryptedData: null,

      setWalletType: (walletType) => set({ walletType, balance: null, info: null }),
      setNwcPairingCode: (code) => set({ nwcPairingCode: code, walletType: code ? 'nwc' : 'none' }),
      setBalance: (balance) => set({ balance }),
      setInfo: (info) => set({ info }),

      setPin: (pinHash, pinSalt, encryptedData) => set({ 
        pinHash, 
        pinSalt, 
        encryptedData, 
        isLocked: false 
      }),
      
      unlock: (data) => set({
        nwcPairingCode: data.nwcPairingCode || null,
        isLocked: false
      }),

      lock: () => set({
        nwcPairingCode: null,
        isLocked: true
      }),

      resetWallet: () => set({ 
        walletType: 'none', 
        nwcPairingCode: null, 
        balance: null, 
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
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        encryptedData: state.encryptedData,
        isLocked: !!state.pinHash,
      }),
    }
  )
);
