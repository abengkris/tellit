import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NDK, { NDKUser, NDKNip07Signer, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { NDKSessionManager } from "@nostr-dev-kit/sessions";
import { resetWoT } from "@/hooks/useWoT";
import { useWalletStore } from "./wallet";

interface AuthState {
  user: NDKUser | null;
  publicKey: string | null;
  privateKey: string | null; 
  accounts: string[]; // Array of public keys
  isLoggedIn: boolean;
  isLoading: boolean;
  loginType: 'nip07' | 'privateKey' | 'none';
  _hasHydrated: boolean;
  
  setHasHydrated: (state: boolean) => void;
  setLoginState: (isLoggedIn: boolean, publicKey: string | null) => void;
  setAccounts: (accounts: string[]) => void;
  login: (ndk: NDK, sessions: NDKSessionManager) => Promise<void>;
  loginWithPrivateKey: (ndk: NDK, sessions: NDKSessionManager, privateKey: string) => Promise<void>;
  generateNewKey: (ndk: NDK, sessions: NDKSessionManager) => Promise<string>;
  switchAccount: (pubkey: string, sessions: NDKSessionManager) => Promise<void>;
  removeAccount: (pubkey: string, sessions: NDKSessionManager) => void;
  logout: (sessions: NDKSessionManager | null) => void;
  logoutAll: (sessions: NDKSessionManager | null) => void;
  setUser: (user: NDKUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      publicKey: null,
      privateKey: null,
      accounts: [],
      isLoggedIn: false,
      isLoading: false,
      loginType: 'none',
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setLoginState: (isLoggedIn, publicKey) => set({ isLoggedIn, publicKey }),
      setUser: (user) => set({ user }),
      setAccounts: (accounts) => set({ accounts }),

      login: async (ndk, sessions) => {
        set({ isLoading: true });
        try {
          const signer = new NDKNip07Signer();
          const pubkey = await sessions.login(signer, {
            setActive: true
          });
          
          if (pubkey) {
            const currentAccounts = get().accounts;
            const newAccounts = currentAccounts.includes(pubkey) 
              ? currentAccounts 
              : [...currentAccounts, pubkey];
              
            set({ 
              publicKey: pubkey, 
              accounts: newAccounts,
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'nip07'
            });
          }
        } catch (error) {
          console.error("NIP-07 login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithPrivateKey: async (ndk, sessions, privateKey) => {
        set({ isLoading: true });
        try {
          const signer = new NDKPrivateKeySigner(privateKey);
          const pubkey = await sessions.login(signer, {
            setActive: true
          });

          if (pubkey) {
            const currentAccounts = get().accounts;
            const newAccounts = currentAccounts.includes(pubkey) 
              ? currentAccounts 
              : [...currentAccounts, pubkey];

            set({ 
              publicKey: pubkey, 
              privateKey: privateKey,
              accounts: newAccounts,
              isLoggedIn: true, 
              isLoading: false,
              loginType: 'privateKey'
            });
          }
        } catch (error) {
          console.error("Private key login failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      generateNewKey: async (ndk, sessions) => {
        const { signer } = await sessions.createAccount({
          // Automatic setup could be added here
        });
        
        const user = await signer.user();
        const pubkey = user.pubkey;
        const privateKey = signer.privateKey!;
        
        const currentAccounts = get().accounts;
        const newAccounts = [...currentAccounts, pubkey];

        set({
          publicKey: pubkey,
          privateKey,
          accounts: newAccounts,
          isLoggedIn: true,
          isLoading: false,
          loginType: 'privateKey'
        });
        
        return privateKey;
      },

      switchAccount: async (pubkey, sessions) => {
        set({ isLoading: true });
        try {
          await sessions.setActive(pubkey);
          // The NDKProvider's session subscription will handle updating the user and login state
          set({ isLoading: false });
        } catch (error) {
          console.error("Failed to switch account:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      removeAccount: (pubkey, sessions) => {
        sessions.removeSession(pubkey);
        const newAccounts = get().accounts.filter(a => a !== pubkey);
        
        if (get().publicKey === pubkey) {
          // If we're removing the active account, log out
          get().logout(sessions);
        }
        
        set({ accounts: newAccounts });
      },

      logout: (sessions) => {
        resetWoT();
        useWalletStore.getState().resetWallet();
        if (sessions) {
          sessions.logout();
        }
        set({ 
          user: null, 
          publicKey: null, 
          privateKey: null, 
          isLoggedIn: false, 
          loginType: 'none' 
        });
      },

      logoutAll: (sessions) => {
        resetWoT();
        useWalletStore.getState().resetWallet();
        if (sessions) {
          const pubkeys = Array.from(sessions.sessions.keys());
          pubkeys.forEach(pk => sessions.removeSession(pk));
          sessions.logout();
        }
        set({ 
          user: null, 
          publicKey: null, 
          privateKey: null, 
          accounts: [],
          isLoggedIn: false, 
          loginType: 'none' 
        });
      },
    }),
    {
      name: "tellit-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
      partialize: (state) => ({ 
        publicKey: state.publicKey, 
        privateKey: state.privateKey, 
        accounts: state.accounts,
        isLoggedIn: state.isLoggedIn, 
        loginType: state.loginType 
      }),
    }
  )
);
